const PAYMENT_TTL_SECONDS = 86400;

function getConfiguration() {
  const required = [
    "DARAJA_CONSUMER_KEY",
    "DARAJA_CONSUMER_SECRET",
    "DARAJA_SHORTCODE",
    "DARAJA_PASSKEY",
    "DARAJA_CALLBACK_URL",
    "ALLOWED_ORIGIN",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "STORE_PRODUCT_PRICES_JSON",
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Payment checkout is not configured. Missing: ${missing.join(", ")}`);
  }

  const environment = process.env.DARAJA_ENV || "sandbox";
  if (!["sandbox", "production"].includes(environment)) {
    throw new Error("DARAJA_ENV must be sandbox or production.");
  }

  let callbackUrl;
  let allowedOrigin;
  let redisUrl;
  try {
    callbackUrl = new URL(process.env.DARAJA_CALLBACK_URL);
    allowedOrigin = new URL(process.env.ALLOWED_ORIGIN);
    redisUrl = new URL(process.env.UPSTASH_REDIS_REST_URL);
  } catch {
    throw new Error("Payment callback, site origin, or Redis URL is invalid.");
  }

  if (callbackUrl.protocol !== "https:" || allowedOrigin.protocol !== "https:" || redisUrl.protocol !== "https:") {
    throw new Error("Payment callback, site origin, and Redis must use HTTPS.");
  }

  if (
    callbackUrl.origin !== allowedOrigin.origin
    || callbackUrl.pathname !== "/api/mpesa/callback"
    || callbackUrl.search
    || callbackUrl.hash
  ) {
    throw new Error("DARAJA_CALLBACK_URL must point to /api/mpesa/callback.");
  }

  if (!/^\d{5,8}$/.test(process.env.DARAJA_SHORTCODE)) {
    throw new Error("DARAJA_SHORTCODE must contain 5 to 8 digits.");
  }

  let productPrices;
  try {
    productPrices = JSON.parse(process.env.STORE_PRODUCT_PRICES_JSON);
  } catch {
    throw new Error("STORE_PRODUCT_PRICES_JSON must be valid JSON.");
  }

  if (!productPrices || Array.isArray(productPrices) || typeof productPrices !== "object") {
    throw new Error("STORE_PRODUCT_PRICES_JSON must be a product-name to KSh price map.");
  }

  Object.entries(productPrices).forEach(([name, price]) => {
    if (!name.trim() || !Number.isSafeInteger(price) || price < 1) {
      throw new Error("Every product price must be a positive whole number of Kenyan shillings.");
    }
  });

  return {
    environment,
    callbackUrl: callbackUrl.toString(),
    allowedOrigin: allowedOrigin.origin,
    productPrices,
    redisUrl: process.env.UPSTASH_REDIS_REST_URL.replace(/\/+$/, ""),
    redisToken: process.env.UPSTASH_REDIS_REST_TOKEN,
    shortcode: process.env.DARAJA_SHORTCODE,
  };
}

async function redisCommand(configuration, ...command) {
  const response = await fetch(
    `${configuration.redisUrl}/${command.map((part) => encodeURIComponent(String(part))).join("/")}`,
    {
      headers: { Authorization: `Bearer ${configuration.redisToken}` },
      signal: AbortSignal.timeout(10000),
    },
  );
  const result = await response.json();
  if (!response.ok || result.error) {
    throw new Error("The payment status store could not complete the request.");
  }
  return result.result;
}

function getTimestamp() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}`;
}

async function getAccessToken(configuration) {
  const host = configuration.environment === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
  const credentials = Buffer.from(
    `${process.env.DARAJA_CONSUMER_KEY}:${process.env.DARAJA_CONSUMER_SECRET}`,
  ).toString("base64");
  const response = await fetch(`${host}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) {
    console.error("Daraja access token request failed.", { status: response.status });
    throw new Error("Safaricom could not authorize the payment request.");
  }
  return { host, accessToken: result.access_token };
}

function normalizePhone(phone) {
  if (typeof phone !== "string") return null;
  const digits = phone.replace(/[\s()+-]/g, "");
  const local = digits.startsWith("254") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  if (!/^(?:7|1)\d{8}$/.test(local)) return null;
  return `254${local}`;
}

module.exports = {
  PAYMENT_TTL_SECONDS,
  getAccessToken,
  getConfiguration,
  getTimestamp,
  normalizePhone,
  redisCommand,
};

const { randomUUID } = require("node:crypto");
const {
  PAYMENT_TTL_SECONDS,
  getAccessToken,
  getConfiguration,
  getTimestamp,
  normalizePhone,
  redisCommand,
} = require("../../lib/mpesa");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Use POST to start a payment." });
  }

  let configuration;
  try {
    configuration = getConfiguration();
  } catch (error) {
    return response.status(503).json({ error: error.message });
  }

  if (request.headers.origin !== configuration.allowedOrigin) {
    return response.status(403).json({ error: "This checkout request is not from the configured shop." });
  }

  const { name, phone, location, items } = request.body || {};
  const normalizedPhone = normalizePhone(phone);
  if (
    typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100
    || !normalizedPhone
    || typeof location !== "string" || location.trim().length < 2 || location.trim().length > 120
    || !Array.isArray(items) || items.length < 1 || items.length > 20
  ) {
    return response.status(400).json({ error: "Enter a valid name, Kenyan mobile number, delivery area, and basket." });
  }

  let amount = 0;
  const validatedItems = [];
  for (const item of items) {
    if (
      !item || typeof item.name !== "string"
      || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 20
    ) {
      return response.status(400).json({ error: "The basket contains an invalid product or quantity." });
    }

    const unitPrice = configuration.productPrices[item.name];
    if (!Number.isSafeInteger(unitPrice) || unitPrice < 1) {
      return response.status(503).json({
        error: `An approved price is not configured for ${item.name}. Please contact the shop before paying.`,
      });
    }

    amount += unitPrice * item.quantity;
    validatedItems.push({ name: item.name, quantity: item.quantity, unitPrice });
  }

  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 150000) {
    return response.status(400).json({ error: "The order total is outside the supported M-Pesa payment range." });
  }

  try {
    const forwardedFor = request.headers["x-forwarded-for"];
    const clientAddress = request.headers["x-real-ip"]
      || (typeof forwardedFor === "string" ? forwardedFor.split(",").at(-1).trim() : "unknown");
    const rateKey = `mpesa-rate:${clientAddress}:${normalizedPhone}`;
    const rateCount = await redisCommand(configuration, "INCR", rateKey);
    if (rateCount === 1) {
      await redisCommand(configuration, "EXPIRE", rateKey, 600);
    } else if (rateCount > 5) {
      return response.status(429).json({ error: "Too many payment prompts. Wait a few minutes and try again." });
    }

    const orderId = randomUUID();
    const timestamp = getTimestamp();
    const password = Buffer.from(
      `${configuration.shortcode}${process.env.DARAJA_PASSKEY}${timestamp}`,
    ).toString("base64");
    const transactionType = process.env.DARAJA_TRANSACTION_TYPE || "CustomerPayBillOnline";
    if (!["CustomerPayBillOnline", "CustomerBuyGoodsOnline"].includes(transactionType)) {
      return response.status(503).json({ error: "DARAJA_TRANSACTION_TYPE must be a supported PayBill or Buy Goods type." });
    }
    const { host, accessToken } = await getAccessToken(configuration);

    const stkResponse = await fetch(`${host}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: configuration.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: transactionType,
        Amount: amount,
        PartyA: normalizedPhone,
        PartyB: configuration.shortcode,
        PhoneNumber: normalizedPhone,
        CallBackURL: configuration.callbackUrl,
        AccountReference: `NERNST${orderId.replaceAll("-", "").slice(0, 6)}`,
        TransactionDesc: "Nernstech order",
      }),
      signal: AbortSignal.timeout(20000),
    });
    const result = await stkResponse.json();
    if (!stkResponse.ok || String(result.ResponseCode) !== "0" || !result.CheckoutRequestID) {
      console.error("Daraja STK Push request failed.", { status: stkResponse.status, responseCode: result.ResponseCode });
      return response.status(502).json({
        error: result.errorMessage || result.ResponseDescription || "Safaricom could not start the M-Pesa prompt.",
      });
    }

    const order = {
      id: orderId,
      status: "pending",
      checkoutRequestId: result.CheckoutRequestID,
      amount,
      items: validatedItems,
      customer: { name: name.trim(), phone: normalizedPhone, location: location.trim() },
      createdAt: new Date().toISOString(),
    };
    await redisCommand(
      configuration,
      "SET",
      `mpesa-order:${orderId}`,
      JSON.stringify(order),
      "EX",
      PAYMENT_TTL_SECONDS,
    );

    return response.status(200).json({
      orderId,
      amount,
      message: "Payment prompt sent. Check your phone and only approve if the amount is correct.",
    });
  } catch (error) {
    console.error("M-Pesa checkout failed.", error);
    return response.status(502).json({ error: error.message || "The M-Pesa request could not be completed." });
  }
};

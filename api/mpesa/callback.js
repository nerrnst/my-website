const { getConfiguration, normalizePhone, redisCommand, PAYMENT_TTL_SECONDS } = require("../../lib/mpesa");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Use POST for the Safaricom callback." });
  }

  let configuration;
  try {
    configuration = getConfiguration();
  } catch (error) {
    console.error("M-Pesa callback configuration is incomplete.", error.message);
    return response.status(503).json({ error: "Payment callback is not configured." });
  }

  const callback = request.body?.Body?.stkCallback;
  if (
    typeof callback?.CheckoutRequestID !== "string"
    || !/^[A-Za-z0-9_-]{8,120}$/.test(callback.CheckoutRequestID)
    || !Number.isInteger(callback.ResultCode)
  ) {
    return response.status(400).json({ error: "The Safaricom callback payload is invalid." });
  }

  try {
    const metadata = callback.CallbackMetadata?.Item;
    const getMetadataValue = (name) => metadata?.find((item) => item.Name === name)?.Value;
    const amount = getMetadataValue("Amount");
    const receipt = getMetadataValue("MpesaReceiptNumber");
    const phone = getMetadataValue("PhoneNumber");
    const result = {
      status: callback.ResultCode === 0 ? "received" : "failed",
      description: typeof callback.ResultDesc === "string"
        ? callback.ResultDesc.slice(0, 200)
        : "Safaricom returned a payment result.",
      amount: Number.isSafeInteger(amount) ? amount : null,
      receipt: typeof receipt === "string" ? receipt : null,
      phone: normalizePhone(String(phone ?? "")),
      receivedAt: new Date().toISOString(),
    };
    await redisCommand(
      configuration,
      "SET",
      `mpesa-result:${callback.CheckoutRequestID}`,
      JSON.stringify(result),
      "EX",
      PAYMENT_TTL_SECONDS,
    );
    return response.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("Could not save the Safaricom payment callback.", error);
    return response.status(503).json({ error: "Payment result could not be saved." });
  }
};

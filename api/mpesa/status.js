const { getConfiguration, redisCommand } = require("../../lib/mpesa");

module.exports = async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Use GET to check payment status." });
  }

  let configuration;
  try {
    configuration = getConfiguration();
  } catch (error) {
    return response.status(503).json({ error: error.message });
  }

  const orderId = request.query?.orderId;
  if (typeof orderId !== "string" || !/^[0-9a-f-]{36}$/i.test(orderId)) {
    return response.status(400).json({ error: "A valid order reference is required." });
  }

  try {
    const storedOrder = await redisCommand(configuration, "GET", `mpesa-order:${orderId}`);
    if (!storedOrder) {
      return response.status(404).json({ error: "This payment request was not found or has expired." });
    }

    const order = JSON.parse(storedOrder);
    const storedResult = await redisCommand(
      configuration,
      "GET",
      `mpesa-result:${order.checkoutRequestId}`,
    );
    const result = storedResult ? JSON.parse(storedResult) : null;
    const callbackMatchesOrder = result?.status === "received"
      && result.amount === order.amount
      && Boolean(result.receipt)
      && result.phone === order.customer.phone;
    const status = result?.status === "failed"
      ? "failed"
      : result?.status === "received"
        ? callbackMatchesOrder ? "paid" : "failed"
        : "pending";
    const message = result?.status === "received" && !callbackMatchesOrder
      ? "Safaricom’s payment details did not match this order. Contact the shop before retrying."
      : result?.description || "Waiting for Safaricom to confirm your payment.";
    return response.status(200).json({
      status,
      message,
      receipt: status === "paid" ? result.receipt : null,
    });
  } catch (error) {
    console.error("Could not read the M-Pesa payment status.", error);
    return response.status(502).json({ error: "The payment status could not be checked. Please try again." });
  }
};

# M-Pesa checkout setup

The product page can request an M-Pesa STK Push from a Vercel serverless function. It does not start a payment until all server settings and approved product prices are configured. Never put Safaricom or Upstash secrets in browser code or commit them to the repository.

## Before enabling checkout

1. Confirm the exact product models and KSh prices. The shop currently has broad product names, not model-specific SKUs. Do not use changing Jumia prices as automatic checkout prices; verify each exact product and approve the amount first.
2. Create a Safaricom Daraja app and configure its shortcode, passkey, and callback URL.
3. Create an Upstash Redis database for short-lived order and callback status records.
4. Add the following as **server-only** environment variables in Vercel:

| Variable | Value |
| --- | --- |
| `DARAJA_ENV` | `sandbox` while testing; set to `production` only after live credentials are approved |
| `DARAJA_CONSUMER_KEY` | Daraja consumer key |
| `DARAJA_CONSUMER_SECRET` | Daraja consumer secret |
| `DARAJA_SHORTCODE` | Safaricom shortcode |
| `DARAJA_PASSKEY` | Daraja Lipa Na M-Pesa passkey |
| `DARAJA_TRANSACTION_TYPE` | `CustomerPayBillOnline` for PayBill or `CustomerBuyGoodsOnline` for a Till |
| `DARAJA_CALLBACK_URL` | `https://your-domain.example/api/mpesa/callback` |
| `ALLOWED_ORIGIN` | The exact public site origin, such as `https://your-domain.example` |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `STORE_PRODUCT_PRICES_JSON` | JSON map of exact shop product names to approved integer KSh prices |

`STORE_PRODUCT_PRICES_JSON` must contain an approved price for every product that can be paid for. The names must exactly match the product names in `products.html`: `Laptop computers`, `Computer accessories`, `Computer monitors`, `Keyboards & mice`, `Webcams & headsets`, `Cables & adapters`, `USB hubs & card readers`, `Laptop stands`, `Printers & office equipment`, `Hard drives & SSDs`, `Flash storage`, `CCTV camera systems`, `Routers & Wi-Fi`, and `Network switches`. The payment endpoint calculates the total from this server-side map; it ignores any client-supplied amount.

5. Test with Daraja sandbox credentials and a public HTTPS Vercel deployment. Verify successful, cancelled, mismatched-amount, and timeout callbacks before enabling production credentials.

The API stores the order details and payment status in Upstash for 24 hours so it can match a Safaricom callback to the order. The STK Push amount covers products only; delivery charges are not included and must be confirmed separately with the customer. After payment confirmation, the customer is asked to contact the shop to arrange delivery; this static site does not yet send an automatic merchant order notification. Do not configure production until prices, callback delivery, and the merchant shortcode have all been verified.

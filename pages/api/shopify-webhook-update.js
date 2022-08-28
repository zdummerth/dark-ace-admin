import crypto from "crypto";
import getRawBody from "raw-body";
import { updateOrder } from "../../lib/fauna-queries";

export default async function handler(req, res) {
  console.log("in shopify webhook");
  const hmac = req.headers["x-shopify-hmac-sha256"];
  const buf = await getRawBody(req);
  const hash = crypto
    .createHmac("sha256", process.env.SHOPIFY_WEBHOOK_SIGNING_SECRET)
    .update(buf, "utf8", "hex")
    .digest("base64");

  if (hash === hmac) {
    // It's a match! Request came from Shopify
    const order = JSON.parse(buf.toString());
    const submitted = await updateOrder(order);
    console.log(submitted);
    res.status(200).json({ name: "Success" });
  } else {
    // No match! This request didn't originate from Shopify
    res.status(401);
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};

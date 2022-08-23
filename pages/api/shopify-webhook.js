import crypto from "crypto";
import getRawBody from "raw-body";
import { submitOrder } from "../../lib/fauna-queries";
import { sendEmail } from "../../lib/sendgrid";

const msgTemplate = (product) => `
  <div>${product.name}</div>
  <div>Qty Remaining: ${product.quantity}</div>
  <div>Id: ${product.shopify_product_id}</div>
  <p></p>
`;

const messsage = (products) => {
  let html = "<h1>New Order From Dark Ace</h1>";
  products.forEach((p) => {
    if (p) {
      html += msgTemplate(p.data);
    }
  });

  return {
    to: process.env.SEND_TO,
    from: process.env.SEND_FROM,
    subject: "New Order From Dark Ace",
    html,
  };
};

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
    const submitted = await submitOrder(order);
    if (submitted.every((cv) => !cv)) {
      //Only send email if product is included in fauna db
      await sendEmail(messsage(submitted));
    }
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

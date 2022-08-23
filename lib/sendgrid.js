import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// const msg = {
//   to: "test@example.com", // Change to your recipient
//   from: "test@example.com", // Change to your verified sender
//   subject: "Sending with SendGrid is Fun",
//   text: "and easy to do anywhere, even with Node.js",
//   html: "<strong>and easy to do anywhere, even with Node.js</strong>",
// };

export const sendEmail = (msg) =>
  new Promise((resolve, reject) => {
    sgMail
      .send(msg)
      .then(() => {
        resolve();
      })
      .catch((error) => {
        reject(error);
      });
  });

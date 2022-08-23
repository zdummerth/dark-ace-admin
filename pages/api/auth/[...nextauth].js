import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/email";
import nodemailer from "nodemailer";
import { Client as FaunaClient } from "faunadb";
import { FaunaAdapter } from "@next-auth/fauna-adapter";

const client = new FaunaClient({
  secret: process.env.FAUNA_SECRET_KEY,
});

export default NextAuth({
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
      maxAge: 10 * 60, // Magic links are valid for 10 min only
    }),
  ],
  adapter: FaunaAdapter(client),
  secret: process.env.JWT_SECRET,
});

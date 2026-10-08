import nodemailer from "nodemailer";

type MailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function transporter() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const secure = (process.env.SMTP_SECURE ?? "true") === "true";
  if (!host || !user || !pass) {
    throw new Error("SMTP non configuré");
  }
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

export function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS,
  );
}

export async function sendMail(input: MailInput) {
  const user = process.env.SMTP_USER?.trim();
  if (!user) throw new Error("SMTP non configuré");
  const from =
    process.env.SMTP_FROM?.trim() || `Campagnes <${user}>`;
  try {
    return await transporter().sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/outbound sending is disabled|554\s*5\.7\.1/i.test(message)) {
      throw new Error(
        "L'envoi sortant est désactivé sur la boîte contact@klambocore.com. Réactivez-le chez l'hébergeur, puis réessayez.",
      );
    }
    throw error;
  }
}

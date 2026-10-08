import { sendMail } from "@/lib/email/mailer";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  url: string;
}) {
  const subject = "Réinitialisation de votre mot de passe";
  const greeting = input.name.trim() || input.to;
  const text = [
    `Bonjour ${greeting},`,
    "",
    "Une réinitialisation de mot de passe a été demandée pour votre compte.",
    "Le lien est valable 1 heure :",
    input.url,
    "",
    "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
  ].join("\n");

  const html = `
    <div style="font-family:Segoe UI,sans-serif;color:#121826;line-height:1.5;">
      <p>Bonjour ${escapeHtml(greeting)},</p>
      <p>Une réinitialisation de mot de passe a été demandée pour votre compte.</p>
      <p><a href="${escapeHtml(input.url)}">Choisir un nouveau mot de passe</a></p>
      <p style="color:#5c6b84;font-size:13px;">Ce lien est valable 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    </div>
  `;

  await sendMail({ to: input.to, subject, text, html });
}

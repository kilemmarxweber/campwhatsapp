import { sendMail } from "@/lib/email/mailer";
import {
  DEFAULT_APP_NAME,
  emailInfoCard,
  emailLayoutHtml,
  emailLink,
  emailSecretValue,
  escapeHtml,
  getSignInUrl,
} from "@/lib/email/email-layout";

const APP_NAME = DEFAULT_APP_NAME;

export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  temporaryPassword: string;
  branchName?: string;
}) {
  const loginUrl = getSignInUrl();
  const hello = `Bonjour ${input.name.trim() || input.to}`;
  const subject = `Mot de passe réinitialisé — ${APP_NAME}`;
  const introText = `${hello}, un nouveau mot de passe temporaire a été défini pour votre compte ${APP_NAME}.`;
  const note =
    "À la première connexion, vous devrez remplacer ce mot de passe avant d'accéder à l'application.";

  const text = [
    hello,
    "",
    introText,
    "",
    `Email : ${input.to}`,
    `Nouveau mot de passe : ${input.temporaryPassword}`,
    "",
    `Connexion : ${loginUrl}`,
    "",
    note,
    "",
    `L'équipe ${APP_NAME}`,
  ].join("\n");

  const html = emailLayoutHtml({
    appName: APP_NAME,
    title: "Mot de passe réinitialisé",
    intro: escapeHtml(introText),
    bodyHtml: `
      ${emailInfoCard([
        { label: "Email", valueHtml: escapeHtml(input.to) },
        {
          label: "Nouveau mot de passe",
          valueHtml: emailSecretValue(input.temporaryPassword),
        },
        { label: "Connexion", valueHtml: emailLink(loginUrl, "Se connecter") },
      ])}
      <p style="margin:0;font-size:14px;line-height:1.7;color:#64748b;">
        ${escapeHtml(note)}
      </p>
    `,
    cta: { href: loginUrl, label: "Se connecter" },
    branchContact: input.branchName ? { name: input.branchName } : undefined,
  });

  await sendMail({ to: input.to, subject, text, html });
}

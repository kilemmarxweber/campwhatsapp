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

export async function sendMemberCreatedEmail(input: {
  to: string;
  name: string;
  organizationName: string;
  branchName: string;
  roleLabel: string;
  temporaryPassword?: string;
}) {
  const loginUrl = getSignInUrl();
  const hello = `Bonjour ${input.name.trim() || input.to}`;
  const subject = `Votre compte — ${APP_NAME}`;
  const introText = input.temporaryPassword
    ? `${hello}, un compte a été créé pour vous sur ${APP_NAME}, en tant que ${input.roleLabel} à ${input.branchName} (${input.organizationName}).`
    : `${hello}, vous avez été ajouté comme ${input.roleLabel} à ${input.branchName} (${input.organizationName}).`;

  const text = [
    hello,
    "",
    introText,
    "",
    `Email : ${input.to}`,
    `Rôle : ${input.roleLabel}`,
    `Organisation : ${input.organizationName}`,
    `Succursale : ${input.branchName}`,
    input.temporaryPassword
      ? `Mot de passe temporaire : ${input.temporaryPassword}`
      : "Connectez-vous avec votre mot de passe habituel.",
    "",
    `Connexion : ${loginUrl}`,
    "",
    input.temporaryPassword
      ? "Remplacez ce mot de passe dès votre première connexion."
      : "",
    "",
    `L'équipe ${APP_NAME}`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  const rows = [
    { label: "Email", valueHtml: escapeHtml(input.to) },
    { label: "Rôle", valueHtml: escapeHtml(input.roleLabel) },
    { label: "Organisation", valueHtml: escapeHtml(input.organizationName) },
    { label: "Succursale", valueHtml: escapeHtml(input.branchName) },
    input.temporaryPassword
      ? {
          label: "Mot de passe temporaire",
          valueHtml: emailSecretValue(input.temporaryPassword),
        }
      : {
          label: "Mot de passe",
          valueHtml: "Utilisez votre mot de passe habituel.",
        },
    { label: "Connexion", valueHtml: emailLink(loginUrl, "Se connecter") },
  ];

  const html = emailLayoutHtml({
    appName: APP_NAME,
    title: "Votre compte est prêt",
    intro: escapeHtml(introText),
    bodyHtml: `
      ${emailInfoCard(rows)}
      <p style="margin:0;font-size:14px;line-height:1.7;color:#64748b;">
        ${
          input.temporaryPassword
            ? "Remplacez ce mot de passe dès votre première connexion."
            : "Connectez-vous avec votre mot de passe habituel."
        }
      </p>
    `,
    cta: { href: loginUrl, label: "Se connecter" },
    branchContact: { name: input.branchName },
  });

  await sendMail({ to: input.to, subject, text, html });
}

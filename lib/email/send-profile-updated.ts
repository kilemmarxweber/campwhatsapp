import { sendMail } from "@/lib/email/mailer";
import {
  DEFAULT_APP_NAME,
  emailLayoutHtml,
  escapeHtml,
  getSignInUrl,
} from "@/lib/email/email-layout";

const APP_NAME = DEFAULT_APP_NAME;

export async function sendProfileUpdatedEmail(input: {
  to: string;
  name: string;
  branchName?: string;
}) {
  const loginUrl = getSignInUrl();
  const hello = `Bonjour ${input.name.trim() || input.to}`;
  const subject = `Profil mis à jour — ${APP_NAME}`;
  const introText = `${hello}, vos informations de compte ont été modifiées sur ${APP_NAME}.`;
  const hint =
    "Si vous n'êtes pas à l'origine de cette modification, contactez l'administrateur de votre succursale.";

  const text = [hello, "", introText, "", hint, "", `Connexion : ${loginUrl}`, "", `L'équipe ${APP_NAME}`].join(
    "\n",
  );

  const html = emailLayoutHtml({
    appName: APP_NAME,
    title: "Profil mis à jour",
    intro: escapeHtml(introText),
    bodyHtml: `
      <p style="margin:0;font-size:14px;line-height:1.7;color:#64748b;">
        ${escapeHtml(hint)}
      </p>
    `,
    cta: { href: loginUrl, label: "Se connecter" },
    branchContact: input.branchName ? { name: input.branchName } : undefined,
  });

  await sendMail({ to: input.to, subject, text, html });
}

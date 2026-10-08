import { sendMail } from "@/lib/email/mailer";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function signInUrl() {
  const base = (
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
  return `${base}/auth/sign-in`;
}

export async function sendMemberCreatedEmail(input: {
  to: string;
  name: string;
  organizationName: string;
  branchName: string;
  roleLabel: string;
  temporaryPassword?: string;
}) {
  const loginUrl = signInUrl();
  const passwordLine = input.temporaryPassword
    ? `Mot de passe temporaire : ${input.temporaryPassword}`
    : "Connectez-vous avec votre mot de passe habituel.";
  const subject = `Votre compte — ${input.branchName}`;
  const text = [
    `Bonjour ${input.name},`,
    "",
    `Un compte a été créé pour vous sur la succursale ${input.branchName} (${input.organizationName}).`,
    `Rôle : ${input.roleLabel}`,
    `Email : ${input.to}`,
    passwordLine,
    "",
    `Connexion : ${loginUrl}`,
    "",
    input.temporaryPassword
      ? "Changez ce mot de passe après votre première connexion."
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const passwordHtml = input.temporaryPassword
    ? `<tr><td style="padding:6px 0;color:#5c6b84;">Mot de passe temporaire</td><td style="padding:6px 0;font-family:ui-monospace,monospace;">${escapeHtml(input.temporaryPassword)}</td></tr>`
    : `<tr><td colspan="2" style="padding:6px 0;">Connectez-vous avec votre mot de passe habituel.</td></tr>`;

  const html = `
    <div style="font-family:Segoe UI,sans-serif;color:#121826;line-height:1.5;">
      <p>Bonjour ${escapeHtml(input.name)},</p>
      <p>Un compte a été créé pour vous sur la succursale <strong>${escapeHtml(input.branchName)}</strong> (${escapeHtml(input.organizationName)}).</p>
      <table style="border-collapse:collapse;">
        <tr><td style="padding:6px 12px 6px 0;color:#5c6b84;">Email</td><td>${escapeHtml(input.to)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#5c6b84;">Rôle</td><td>${escapeHtml(input.roleLabel)}</td></tr>
        ${passwordHtml}
      </table>
      <p><a href="${escapeHtml(loginUrl)}">Se connecter</a></p>
      ${input.temporaryPassword ? "<p style=\"color:#5c6b84;font-size:13px;\">Changez ce mot de passe après votre première connexion.</p>" : ""}
    </div>
  `;

  await sendMail({ to: input.to, subject, text, html });
}

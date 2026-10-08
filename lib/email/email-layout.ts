export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export const DEFAULT_APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME?.trim() || "TVS Motors";

const BRAND = "#1a2b5c";
const BRAND_BUTTON = "#253c80";
const LINK = "#253c80";

export function getSignInUrl(path = "/auth/sign-in"): string {
  const base = (
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getEmailContactInfo() {
  const name = DEFAULT_APP_NAME;
  const email =
    process.env.CONTACT_EMAIL?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "contact@klambocore.com";
  const phone = process.env.CONTACT_PHONE?.trim() || "";
  return { name, email, phone };
}

type EmailLayoutInput = {
  appName: string;
  title: string;
  intro: string;
  bodyHtml: string;
  cta?: { href: string; label: string };
  footerNote?: string;
  branchContact?: { name?: string; phone?: string; address?: string };
};

function buildBranchSignatureHtml(branch?: EmailLayoutInput["branchContact"]): string {
  if (!branch?.name && !branch?.phone && !branch?.address) return "";
  const lines: string[] = [];
  if (branch.name) {
    lines.push(
      `<div style="font-weight:600;color:#334155;">${escapeHtml(branch.name)}</div>`,
    );
  }
  if (branch.phone) {
    lines.push(
      `<div><a href="tel:${escapeHtml(branch.phone)}" style="color:#64748b;text-decoration:none;">${escapeHtml(branch.phone)}</a></div>`,
    );
  }
  if (branch.address) {
    lines.push(`<div>${escapeHtml(branch.address)}</div>`);
  }
  return `
    <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;font-size:12px;line-height:1.6;color:#64748b;">
      ${lines.join("")}
    </div>
  `;
}

function buildPlatformSignatureHtml(): string {
  const contact = getEmailContactInfo();
  const phone = contact.phone
    ? `&nbsp;·&nbsp;<a href="tel:${escapeHtml(contact.phone)}" style="color:#94a3b8;text-decoration:none;">${escapeHtml(contact.phone)}</a>`
    : "";
  return `
    <div style="font-size:10px;line-height:1.5;color:#94a3b8;">
      <div style="margin-bottom:2px;">
        Plateforme
        <span style="color:#94a3b8;font-weight:600;">${escapeHtml(contact.name)}</span>
      </div>
      <div>
        <a href="mailto:${escapeHtml(contact.email)}" style="color:#94a3b8;text-decoration:none;">
          ${escapeHtml(contact.email)}
        </a>
        ${phone}
      </div>
    </div>
  `;
}

/** Même structure que les emails Eteyelo, couleurs TVS. */
export function emailLayoutHtml(input: EmailLayoutInput): string {
  const footer =
    input.footerNote ??
    `Email automatique envoyé depuis ${escapeHtml(input.appName)}.`;
  const ctaHtml = input.cta
    ? `
      <div style="margin-top:28px;">
        <a href="${escapeHtml(input.cta.href)}" style="display:inline-block;background:${BRAND_BUTTON};color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-size:14px;font-weight:bold;">
          ${escapeHtml(input.cta.label)}
        </a>
      </div>`
    : "";

  return `
    <div style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#0f172a;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:32px 16px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e5e7eb;">
              <tr>
                <td style="background:${BRAND};padding:28px 32px;color:#ffffff;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:48px;vertical-align:middle;">
                        <div style="width:48px;height:48px;line-height:48px;text-align:center;background:#ffffff;border-radius:12px;color:${BRAND};font-size:14px;font-weight:700;">TVS</div>
                      </td>
                      <td style="vertical-align:middle;padding-left:14px;">
                        <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">
                          ${escapeHtml(input.appName)}
                        </div>
                        <h1 style="margin:8px 0 0;font-size:24px;line-height:1.3;">
                          ${escapeHtml(input.title)}
                        </h1>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 32px;">
                  <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#475569;">
                    ${input.intro}
                  </p>
                  ${input.bodyHtml}
                  ${ctaHtml}
                </td>
              </tr>
              <tr>
                <td style="background:#f8fafc;padding:18px 32px;text-align:center;">
                  ${buildBranchSignatureHtml(input.branchContact)}
                  ${buildPlatformSignatureHtml()}
                  <div style="margin-top:10px;font-size:10px;color:#cbd5e1;">
                    ${footer}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

export function emailInfoCard(
  rows: Array<{ label: string; valueHtml: string }>,
): string {
  const items = rows
    .map(
      (row, index) => `
        <p style="margin:${index === 0 ? "0" : "10px"} 0 ${index === rows.length - 1 ? "0" : "10px"};font-size:14px;">
          <strong>${escapeHtml(row.label)} :</strong> ${row.valueHtml}
        </p>`,
    )
    .join("");

  return `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:20px;margin-bottom:24px;">
      ${items}
    </div>
  `;
}

export function emailSecretValue(value: string): string {
  return `<span style="display:inline-block;margin-top:4px;background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;padding:8px 12px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:15px;font-weight:700;letter-spacing:.04em;color:#92400e;">${escapeHtml(value)}</span>`;
}

export function emailLink(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="color:${LINK};text-decoration:none;">${escapeHtml(label)}</a>`;
}

export type TemplateLinks = {
  link1Label?: string | null;
  link1Url?: string | null;
  link2Label?: string | null;
  link2Url?: string | null;
};

/** Assemble légende WhatsApp : texte + 1–2 liens du template. */
export function composeTemplateCaption(
  body: string,
  links: TemplateLinks,
  extraNote?: string,
): string {
  const parts: string[] = [body.trim()];

  const l1 = links.link1Url?.trim();
  if (l1) {
    const label = links.link1Label?.trim() || "Lien";
    parts.push(`👉 ${label} : ${l1}`);
  }
  const l2 = links.link2Url?.trim();
  if (l2) {
    const label = links.link2Label?.trim() || "Lien";
    parts.push(`👉 ${label} : ${l2}`);
  }

  const note = extraNote?.trim();
  if (note) {
    parts.push(note);
  }

  return parts.filter(Boolean).join("\n\n");
}

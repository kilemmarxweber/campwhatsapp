import type { CSSProperties } from "react";
import { publicUploadUrl } from "@/lib/upload-url";

export const APP_LINKS = [
  {
    id: "site",
    label: "Site",
    url:
      process.env.NEXT_PUBLIC_APP_SITE_URL?.trim() ||
      "https://www.tvsrdcongo.com/",
  },
  {
    id: "produits",
    label: "Produits",
    url:
      process.env.NEXT_PUBLIC_APP_PRODUCTS_URL?.trim() ||
      "https://www.tvsrdcongo.com/",
  },
  {
    id: "credit",
    label: "Crédit moto",
    url:
      process.env.NEXT_PUBLIC_APP_CREDIT_URL?.trim() ||
      "https://www.tvsrdcongo.com/",
  },
] as const;

export type TextStyle = "normal" | "promo" | "offer";

/** Applique un style WhatsApp (*gras* / majuscules) au texte du template. */
export function applyTextStyle(body: string, style: TextStyle): string {
  const trimmed = body.trim();
  if (!trimmed) return trimmed;
  if (style === "normal") return trimmed;

  const lines = trimmed.split("\n");
  const [first, ...rest] = lines;
  const headline = first.replace(/^\*+|\*+$/g, "").trim();

  if (style === "promo") {
    return [
      `*${uppercasePreservingPlaceholders(headline)}*`,
      ...rest,
    ]
      .join("\n")
      .trim();
  }
  // offer
  return [`🔥 *${headline}*`, ...rest].join("\n").trim();
}

/** Majuscules sans toucher aux {{variables}}. */
function uppercasePreservingPlaceholders(text: string): string {
  const parts: string[] = [];
  let last = 0;
  const re = /\{\{\s*[a-zA-Z0-9_]+\s*\}\}/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    parts.push(text.slice(last, match.index).toUpperCase());
    parts.push(match[0]);
    last = match.index + match[0].length;
  }
  parts.push(text.slice(last).toUpperCase());
  return parts.join("");
}

const PLACEHOLDER = /\{\{\s*[a-zA-Z0-9_]+\s*\}\}/gi;

/** Affiche le texte en gardant {{name}}, {{phone}}, … visibles. */
export function PlaceholderText({
  text,
  className,
  style,
}: {
  text: string;
  className?: string;
  style?: CSSProperties;
}) {
  const parts: Array<string | { token: string; key: number }> = [];
  const re = new RegExp(PLACEHOLDER.source, "gi");
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push({ token: match[0], key: index++ });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return (
    <p className={className} style={style}>
      {parts.map((part, i) =>
        typeof part === "string" ? (
          <span key={`t-${i}`}>{part}</span>
        ) : (
          <span
            key={part.key}
            className="rounded bg-[var(--tvs-blue-soft)] px-1 font-medium text-[var(--tvs-blue)]"
          >
            {part.token}
          </span>
        ),
      )}
    </p>
  );
}

type MessageCardPreviewProps = {
  channel?: "whatsapp" | "sms";
  messageType: "text" | "image" | "video";
  caption: string;
  textStyle?: TextStyle;
  media?: {
    storagePath: string;
    kind: string;
    filename: string;
  } | null;
  brand?: string;
};

/** Carte unique style WhatsApp : média en haut, texte + liens en bas. */
export function MessageCardPreview({
  channel = "whatsapp",
  messageType,
  caption,
  textStyle = "normal",
  media,
  brand = "Succursale",
}: MessageCardPreviewProps) {
  const src = media?.storagePath
    ? publicUploadUrl(media.storagePath)
    : null;
  const isSms = channel === "sms";
  const isMedia = !isSms && (messageType === "image" || messageType === "video");

  const captionStyle: CSSProperties =
    textStyle === "promo"
      ? {
          color: "var(--tvs-blue-deep)",
          fontWeight: 600,
          letterSpacing: "0.01em",
        }
      : textStyle === "offer"
        ? {
            color: "var(--tvs-red)",
            fontWeight: 600,
          }
        : { color: "var(--tvs-blue-deep)" };

  return (
    <div
      className="overflow-hidden rounded-2xl border border-[var(--border)] shadow-sm"
      style={{
        maxWidth: 340,
        background:
          "linear-gradient(180deg, #ffffff 0%, color-mix(in oklab, var(--tvs-blue-soft) 55%, white) 100%)",
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 text-[11px] font-semibold tracking-wide uppercase"
        style={{
          background:
            "linear-gradient(90deg, var(--tvs-blue) 0%, var(--tvs-blue) 58%, var(--tvs-red) 58%, var(--tvs-red) 100%)",
          color: "#fff",
        }}
      >
        <span>{brand}</span>
        <span style={{ opacity: 0.85 }}>{isSms ? "SMS" : "WhatsApp"}</span>
      </div>

      {isMedia && src ? (
        messageType === "video" ? (
          <video
            src={src}
            controls
            className="block w-full bg-black"
            style={{ maxHeight: 220, objectFit: "cover" }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={media?.filename ?? "média"}
            className="block w-full"
            style={{ maxHeight: 220, objectFit: "cover" }}
          />
        )
      ) : isMedia ? (
        <div
          className="flex h-36 items-center justify-center text-sm"
          style={{ background: "var(--tvs-blue-soft)", color: "var(--fg-muted)" }}
        >
          Choisissez une image ou vidéo
        </div>
      ) : null}

      <div className="space-y-2 px-3 py-3">
        <PlaceholderText
          text={caption.trim() || "Votre texte apparaîtra ici…"}
          className="whitespace-pre-wrap text-sm leading-relaxed"
          style={isSms ? { color: "var(--tvs-blue-deep)" } : captionStyle}
        />
        <p className="text-[10px] text-[var(--fg-muted)]">
          {isSms
            ? "Texte (variables {{name}}, {{phone}}, …) et liens, sans média"
            : isMedia
              ? "Envoyé ensemble : média + texte (variables {{name}}, {{phone}}, …)"
              : "Message texte (variables {{name}}, {{phone}}, …)"}
        </p>
      </div>
    </div>
  );
}

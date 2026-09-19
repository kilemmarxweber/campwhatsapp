import type { CSSProperties } from "react";
import { publicUploadUrl } from "@/lib/upload-url";

export const APP_LINKS = [
  {
    id: "site",
    label: "Site TVS",
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
  if (style === "promo") {
    const headline = first.replace(/^\*+|\*+$/g, "").trim();
    return [`*${headline.toUpperCase()}*`, ...rest].join("\n").trim();
  }
  // offer
  const headline = first.replace(/^\*+|\*+$/g, "").trim();
  return [`🔥 *${headline}*`, ...rest].join("\n").trim();
}

type MessageCardPreviewProps = {
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
  messageType,
  caption,
  textStyle = "normal",
  media,
  brand = "TVS Motors",
}: MessageCardPreviewProps) {
  const src = media?.storagePath
    ? publicUploadUrl(media.storagePath)
    : null;
  const isMedia = messageType === "image" || messageType === "video";

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
        <span style={{ opacity: 0.85 }}>WhatsApp</span>
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
        <p
          className="whitespace-pre-wrap text-sm leading-relaxed"
          style={captionStyle}
        >
          {caption.trim() || "Votre légende apparaîtra ici…"}
        </p>
        <p className="text-[10px] text-[var(--fg-muted)]">
          {isMedia
            ? "Envoyé ensemble : média + texte (légende WhatsApp)"
            : "Message texte seul"}
        </p>
      </div>
    </div>
  );
}

const ALLOWED_IMAGE = new Set(["image/jpeg", "image/png"]);
const ALLOWED_VIDEO = new Set(["video/mp4", "video/3gpp"]);

const IMAGE_MAX = 5 * 1024 * 1024;
const VIDEO_MAX = 30 * 1024 * 1024;
const IMAGE_MIN = 2_000;
const VIDEO_MIN = 10_000;

function guessMime(mimeType: string, filename?: string): string {
  const mime = (mimeType || "").toLowerCase().trim();
  if (mime) return mime;
  const name = (filename ?? "").toLowerCase();
  if (/\.jpe?g$/.test(name)) return "image/jpeg";
  if (/\.png$/.test(name)) return "image/png";
  if (/\.mp4$/.test(name)) return "video/mp4";
  if (/\.3gp$/.test(name)) return "video/3gpp";
  return "";
}

/** Contrôle type + taille avant envoi (client et serveur). */
export function validateMediaUpload(input: {
  mimeType: string;
  size: number;
  filename?: string;
}): { ok: true; kind: "image" | "video"; mimeType: string } | { ok: false; message: string } {
  const mime = guessMime(input.mimeType, input.filename);
  const isImage = mime.startsWith("image/");
  const isVideo = mime.startsWith("video/");

  if (!isImage && !isVideo) {
    return {
      ok: false,
      message:
        "Type non autorisé. Choisissez une image (JPEG, PNG) ou une vidéo (MP4).",
    };
  }

  if (isImage) {
    if (!ALLOWED_IMAGE.has(mime)) {
      return {
        ok: false,
        message: "Image non autorisée. Formats acceptés : JPEG ou PNG.",
      };
    }
    if (input.size < IMAGE_MIN) {
      return {
        ok: false,
        message: "Image trop petite. Utilisez une vraie photo.",
      };
    }
    if (input.size > IMAGE_MAX) {
      return {
        ok: false,
        message: "Image trop lourde. Taille max recommandée : 5 Mo.",
      };
    }
    return { ok: true, kind: "image", mimeType: mime };
  }

  if (!ALLOWED_VIDEO.has(mime)) {
    return {
      ok: false,
      message: "Vidéo non autorisée. Formats acceptés : MP4 ou 3GPP.",
    };
  }
  if (input.size < VIDEO_MIN) {
    return {
      ok: false,
      message: "Vidéo trop petite. Utilisez un vrai fichier MP4.",
    };
  }
  if (input.size > VIDEO_MAX) {
    return {
      ok: false,
      message: "Vidéo trop lourde. Taille max recommandée : 30 Mo.",
    };
  }
  return { ok: true, kind: "video", mimeType: mime };
}

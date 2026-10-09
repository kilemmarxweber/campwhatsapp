import { publicUploadUrl } from "@/lib/upload-url";

const VPS_MEDIA_ORIGIN = "https://campagn.klambocore.com";

function isPublicHttpsOrigin(value: string) {
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname !== "localhost" &&
      parsed.hostname !== "127.0.0.1"
    );
  } catch {
    return false;
  }
}

/**
 * Origine qui sert UPLOAD_DIR.
 * En production c'est BETTER_AUTH_URL. En local, les fichiers d'approbation
 * sont ceux du VPS (`/var/www/api-uploads`).
 */
export function mediaPublicOrigin() {
  const explicit = process.env.MEDIA_PUBLIC_BASE_URL?.trim().replace(/\/$/, "");
  if (explicit && isPublicHttpsOrigin(explicit)) return explicit;
  const auth = (
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    ""
  ).replace(/\/$/, "");
  if (auth && isPublicHttpsOrigin(auth)) return auth;
  return VPS_MEDIA_ORIGIN;
}

/** Chemin relatif sous UPLOAD_DIR : `{orgId}/{fichier}`. */
export function uploadStorageRelative(storagePath: string) {
  return storagePath
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^uploads\//, "");
}

/** Adresse https du fichier, pour qu'Infobip puisse le télécharger sur le VPS. */
export function absoluteUploadUrl(storagePath: string) {
  return `${mediaPublicOrigin()}${publicUploadUrl(uploadStorageRelative(storagePath))}`;
}

export function isInfobipReachableMediaUrl(url: string) {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname !== "localhost" &&
      parsed.hostname !== "127.0.0.1"
    );
  } catch {
    return false;
  }
}

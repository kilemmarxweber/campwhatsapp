/** URL publique TVS pour un chemin relatif sous UPLOAD_DIR. */
export function publicUploadUrl(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  return `/api/uploads/${normalized
    .split("/")
    .filter(Boolean)
    .map((p) => encodeURIComponent(p))
    .join("/")}`;
}

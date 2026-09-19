import { publicUploadUrl } from "@/lib/upload-url";

export function MediaThumb({
  storagePath,
  kind,
  filename,
}: {
  storagePath: string;
  kind: string;
  filename: string;
}) {
  const src = publicUploadUrl(storagePath);

  if (kind === "video") {
    return (
      <video
        src={src}
        controls
        style={{
          maxWidth: "100%",
          maxHeight: 180,
          borderRadius: 8,
          background: "#0a0a0a",
        }}
      >
        {filename}
      </video>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={filename}
      style={{
        maxWidth: "100%",
        maxHeight: 160,
        borderRadius: 8,
        objectFit: "cover",
        border: "1px solid var(--border)",
      }}
    />
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { uploadMediaAsset } from "@/lib/campaigns/actions";

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function MediaUpload({
  organizationId,
  orgSlug,
}: {
  organizationId: string;
  orgSlug: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="surface p-5">
      <h2 className="mb-2 font-medium">Uploader un média</h2>
      <p className="mb-3 text-sm text-[var(--fg-muted)]">
        Image ≤ 5 Mo (jpeg/png) · Vidéo ≤ 16 Mo (mp4)
      </p>
      <input
        type="file"
        accept="image/jpeg,image/png,video/mp4,video/3gpp"
        disabled={pending}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            if (!(result instanceof ArrayBuffer)) return;
            startTransition(async () => {
              try {
                await uploadMediaAsset({
                  organizationId,
                  orgSlug,
                  filename: file.name,
                  mimeType: file.type || "application/octet-stream",
                  base64: arrayBufferToBase64(result),
                });
                toast.success("Média ajouté");
                router.refresh();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erreur");
              }
            });
          };
          reader.readAsArrayBuffer(file);
        }}
      />
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpenIcon } from "lucide-react";
import { toast } from "sonner";
import { uploadMediaAsset } from "@/lib/campaigns/actions";
import { validateMediaUpload } from "@/lib/media/validate";
import { usePendingOverlay } from "@/components/page-loader";

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
  const { pending, startTransition } = usePendingOverlay("Envoi du média…");
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleFile(file: File, input: HTMLInputElement) {
    const checked = validateMediaUpload({
      mimeType: file.type,
      size: file.size,
      filename: file.name,
    });
    if (!checked.ok) {
      toast.error(checked.message);
      input.value = "";
      setFileName(null);
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (!(result instanceof ArrayBuffer)) return;
      startTransition(async () => {
        try {
          const upload = await uploadMediaAsset({
            organizationId,
            orgSlug,
            filename: file.name,
            mimeType: checked.mimeType,
            base64: arrayBufferToBase64(result),
          });
          if (!upload.ok) {
            toast.error(upload.message);
            return;
          }
          toast.success("Média ajouté");
          router.refresh();
        } catch {
          toast.error("Impossible d'envoyer ce média");
        } finally {
          input.value = "";
          setFileName(null);
        }
      });
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <div className="surface p-5">
      <h2 className="mb-2 font-medium">Uploader un média</h2>
      <p className="mb-3 text-sm text-[var(--fg-muted)]">
        Image ≤ 5 Mo (jpeg/png) · Vidéo ≤ 30 Mo (mp4)
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,video/mp4,video/3gpp"
        className="sr-only"
        tabIndex={-1}
        disabled={pending}
        onChange={(e) => {
          const input = e.currentTarget;
          const file = input.files?.[0];
          if (!file) return;
          handleFile(file, input);
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          <FolderOpenIcon className="size-3.5" aria-hidden />
          Parcourir
        </button>
        <span className="truncate text-xs text-[var(--fg-muted)]">
          {fileName ?? "Aucun fichier sélectionné"}
        </span>
      </div>
    </div>
  );
}

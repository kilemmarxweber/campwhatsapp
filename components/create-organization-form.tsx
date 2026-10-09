"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { createTenantOrganization } from "@/lib/succursales/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export function AddOrganizationButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  function reset() {
    setName("");
    setSlug("");
    setLogoFile(null);
    setLogoPreview(null);
  }

  function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("Lecture logo impossible"));
          return;
        }
        const comma = result.indexOf(",");
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => reject(reader.error ?? new Error("Lecture logo"));
      reader.readAsDataURL(file);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button />}>
        <PlusIcon />
        Ajouter
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              let logoBase64: string | undefined;
              let logoFilename: string | undefined;
              let logoMimeType: string | undefined;
              if (logoFile) {
                logoBase64 = await readFileAsBase64(logoFile);
                logoFilename = logoFile.name;
                logoMimeType = logoFile.type || "image/png";
              }
              const result = await createTenantOrganization({
                name,
                slug: slug || slugify(name),
                logoBase64,
                logoFilename,
                logoMimeType,
              });
              if (!result.ok) {
                toast.error(result.message);
                return;
              }
              toast.success("Organisation créée");
              reset();
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <DialogHeader className="pr-8">
            <DialogTitle>Nouvelle organisation</DialogTitle>
            <DialogDescription>
              Réservé au propriétaire. Le logo apparaît sur l’export Excel
              contacts ; les succursales s’ajoutent ensuite dans
              l’organisation.
            </DialogDescription>
          </DialogHeader>
          <div className="field">
            <label htmlFor="org-name">Nom</label>
            <input
              id="org-name"
              required
              placeholder="ex. TVS R.D. Congo"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setSlug(slugify(event.target.value));
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="org-slug">Slug</label>
            <input
              id="org-slug"
              required
              value={slug}
              onChange={(event) => setSlug(slugify(event.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="org-logo">Logo (optionnel)</label>
            <input
              id="org-logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setLogoFile(file);
                setLogoPreview(file ? URL.createObjectURL(file) : null);
              }}
            />
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoPreview}
                alt=""
                className="mt-2 h-12 w-auto max-w-[200px] object-contain"
              />
            ) : null}
            <p className="text-xs text-[var(--fg-muted)]">
              PNG, JPEG ou WebP — max 2 Mo. Non affiché ailleurs dans l’app pour
              l’instant.
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Création…" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { createSuccursale } from "@/lib/succursales/actions";
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

export function AddSuccursaleButton({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  function reset() {
    setName("");
    setSlug("");
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
              try {
                await createSuccursale({
                  name,
                  slug: slug || slugify(name),
                  tenantId,
                });
                toast.success("Succursale créée");
                reset();
                setOpen(false);
                router.refresh();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erreur");
              }
            });
          }}
        >
          <DialogHeader className="pr-8">
            <DialogTitle>Nouvelle succursale</DialogTitle>
            <DialogDescription>
              Les contacts et les campagnes restent isolés dans cette succursale.
            </DialogDescription>
          </DialogHeader>
          <div className="field">
            <label htmlFor="branch-name">Nom</label>
            <input
              id="branch-name"
              required
              placeholder="ex. Kinshasa Centre"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setSlug(slugify(event.target.value));
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="branch-slug">Slug</label>
            <input
              id="branch-slug"
              required
              value={slug}
              onChange={(event) => setSlug(slugify(event.target.value))}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || !tenantId}>
              {pending ? "Création…" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

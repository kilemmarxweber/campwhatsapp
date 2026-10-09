"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArchiveIcon, ArchiveRestoreIcon, EllipsisIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  deleteSuccursale,
  deleteTenantOrganization,
  setSuccursaleArchived,
  setTenantOrganizationArchived,
  updateSuccursale,
  updateTenantOrganization,
} from "@/lib/succursales/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export function RecordActions({
  kind,
  id,
  name,
  slug,
  archived,
}: {
  kind: "organisation" | "succursale";
  id: string;
  name: string;
  slug: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [nextName, setNextName] = useState(name);
  const [nextSlug, setNextSlug] = useState(slug);
  const label = kind === "organisation" ? "organisation" : "succursale";

  function run(action: () => Promise<{ ok: true } | { ok: false; message: string }>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(success);
      setEditOpen(false);
      setArchiveOpen(false);
      setDeleteOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Actions pour ${name}`}
              disabled={pending}
            />
          }
        >
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                setNextName(name);
                setNextSlug(slug);
                setEditOpen(true);
              }}
            >
              <PencilIcon />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setArchiveOpen(true)}>
              {archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
              {archived ? "Restaurer" : "Archiver"}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2Icon />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const payload = { name: nextName, slug: nextSlug || slugify(nextName) };
              run(
                () =>
                  kind === "organisation"
                    ? updateTenantOrganization({ tenantId: id, ...payload })
                    : updateSuccursale({ branchId: id, ...payload }),
                kind === "organisation" ? "Organisation mise à jour" : "Succursale mise à jour",
              );
            }}
          >
            <DialogHeader className="pr-8">
              <DialogTitle>Modifier la {label}</DialogTitle>
              <DialogDescription>
                Le slug sert dans l&apos;adresse. Le changer met à jour les liens.
              </DialogDescription>
            </DialogHeader>
            <div className="field">
              <label htmlFor={`record-name-${id}`}>Nom</label>
              <input
                id={`record-name-${id}`}
                required
                value={nextName}
                onChange={(event) => setNextName(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor={`record-slug-${id}`}>Slug</label>
              <input
                id={`record-slug-${id}`}
                required
                value={nextSlug}
                onChange={(event) => setNextSlug(slugify(event.target.value))}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {archived ? "Restaurer" : "Archiver"} la {label}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {archived
                ? `${name} redevient visible dans les tableaux de bord.`
                : `${name} disparaît des tableaux de bord. Vous pourrez la restaurer ensuite.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    kind === "organisation"
                      ? setTenantOrganizationArchived({ tenantId: id, archived: !archived })
                      : setSuccursaleArchived({ branchId: id, archived: !archived }),
                  archived ? "Restaurée" : "Archivée",
                )
              }
            >
              {archived ? "Restaurer" : "Archiver"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la {label}</AlertDialogTitle>
            <AlertDialogDescription>
              {kind === "organisation"
                ? `${name} sera supprimée avec ses succursales, contacts et campagnes. Cette action est définitive.`
                : `${name} sera supprimée avec ses contacts, médias et campagnes. Cette action est définitive.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    kind === "organisation"
                      ? deleteTenantOrganization({ tenantId: id })
                      : deleteSuccursale({ branchId: id }),
                  kind === "organisation" ? "Organisation supprimée" : "Succursale supprimée",
                )
              }
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

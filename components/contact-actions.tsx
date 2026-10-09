"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CountryCode } from "libphonenumber-js";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  EllipsisIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteContact,
  setContactArchived,
  updateContact,
} from "@/lib/contacts/actions";
import { splitStoredPhone } from "@/lib/phone";
import {
  EMAIL_MAX_LENGTH,
  PERSON_NAME_MAX_LENGTH,
  emailValidationMessage,
  filterEmailInput,
  filterPersonName,
  normalizeEmail,
} from "@/lib/input-security";
import { usePendingOverlay } from "@/components/page-loader";
import {
  PhoneInputField,
  resolvePhoneInput,
  type PhoneInputValue,
} from "@/components/phone-input-field";
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

function phoneFromContact(
  phone: string,
  fallbackCountry: CountryCode,
): PhoneInputValue {
  const split = splitStoredPhone(phone, fallbackCountry);
  return { country: split.country, national: split.national };
}

export function ContactActions({
  organizationId,
  orgSlug,
  defaultCountry,
  contact,
  onDeleted,
}: {
  organizationId: string;
  orgSlug: string;
  defaultCountry: CountryCode;
  contact: {
    id: string;
    phone: string;
    name: string | null;
    email: string | null;
    archivedAt: string | null;
  };
  onDeleted?: (id: string) => void;
}) {
  const router = useRouter();
  const { pending, startTransition } = usePendingOverlay();
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [phoneValue, setPhoneValue] = useState<PhoneInputValue>(() =>
    phoneFromContact(contact.phone, defaultCountry),
  );
  const [name, setName] = useState(contact.name ?? "");
  const [email, setEmail] = useState(contact.email ?? "");
  const archived = Boolean(contact.archivedAt);
  const label = contact.name || contact.phone;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Actions pour ${label}`}
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
                setPhoneValue(phoneFromContact(contact.phone, defaultCountry));
                setName(contact.name ?? "");
                setEmail(contact.email ?? "");
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
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2Icon />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="overflow-visible sm:max-w-md">
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const checked = resolvePhoneInput(phoneValue);
              if (!checked.ok) {
                toast.error(checked.message);
                return;
              }
              const trimmedEmail = email.trim();
              if (trimmedEmail) {
                const emailError = emailValidationMessage(trimmedEmail);
                if (emailError) {
                  toast.error(emailError);
                  return;
                }
              }
              startTransition(async () => {
                try {
                  await updateContact({
                    organizationId,
                    orgSlug,
                    contactId: contact.id,
                    phone: checked.e164,
                    name: filterPersonName(name),
                    email: trimmedEmail
                      ? normalizeEmail(trimmedEmail)
                      : "",
                  });
                  toast.success("Contact mis à jour");
                  setEditOpen(false);
                  router.refresh();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Erreur");
                }
              });
            }}
          >
            <DialogHeader>
              <DialogTitle>Modifier le contact</DialogTitle>
              <DialogDescription>
                Mettez à jour le téléphone, le nom ou l’email.
              </DialogDescription>
            </DialogHeader>
            <PhoneInputField
              id={`edit-phone-${contact.id}`}
              required
              value={phoneValue}
              onChange={setPhoneValue}
              disabled={pending}
            />
            <div className="contacts-name-email">
              <div className="field field-sm">
                <label htmlFor={`edit-name-${contact.id}`}>Nom</label>
                <input
                  id={`edit-name-${contact.id}`}
                  value={name}
                  maxLength={PERSON_NAME_MAX_LENGTH}
                  onChange={(e) => setName(filterPersonName(e.target.value))}
                  placeholder="Optionnel"
                  spellCheck={false}
                />
              </div>
              <div className="field field-sm">
                <label htmlFor={`edit-email-${contact.id}`}>Email</label>
                <input
                  id={`edit-email-${contact.id}`}
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={EMAIL_MAX_LENGTH}
                  value={email}
                  onChange={(e) => setEmail(filterEmailInput(e.target.value))}
                  onBlur={() => {
                    if (email.trim()) setEmail(normalizeEmail(email));
                  }}
                  placeholder="Optionnel"
                />
              </div>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {archived ? "Restaurer ce contact ?" : "Archiver ce contact ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {archived
                ? `« ${label} » redeviendra actif dans la base destinataires.`
                : `« ${label} » sera masqué des envois actifs. Vous pourrez le restaurer.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await setContactArchived({
                      organizationId,
                      orgSlug,
                      contactId: contact.id,
                      archived: !archived,
                    });
                    toast.success(archived ? "Contact restauré" : "Contact archivé");
                    setArchiveOpen(false);
                    router.refresh();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Erreur");
                  }
                })
              }
            >
              {archived ? "Restaurer" : "Archiver"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce contact ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {label} » sera retiré définitivement de la base destinataires.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await deleteContact({
                      organizationId,
                      orgSlug,
                      contactId: contact.id,
                    });
                    toast.success("Contact supprimé");
                    onDeleted?.(contact.id);
                    setDeleteOpen(false);
                    router.refresh();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Erreur");
                  }
                })
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

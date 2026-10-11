"use client";

import { useEffect, useMemo, useState, type TransitionStartFunction } from "react";
import {
  ChevronDownIcon,
  PlusIcon,
  Trash2Icon,
  UserMinusIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  addContactsToList,
  removeContactsFromList,
  deleteContactList,
} from "@/lib/contacts/actions";
import { ConfirmAlertDialogButton } from "@/components/confirm-alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ContactGroupMember = {
  id: string;
  phone: string;
  name: string | null;
  archivedAt: Date | string | null;
};

export type ContactGroupList = {
  id: string;
  name: string;
  members: ContactGroupMember[];
};

export function ContactGroupRow({
  list,
  organizationId,
  orgSlug,
  selectedIds,
  pending,
  startTransition,
  onChanged,
}: {
  list: ContactGroupList;
  organizationId: string;
  orgSlug: string;
  selectedIds: string[];
  pending: boolean;
  startTransition: TransitionStartFunction;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  const memberIds = useMemo(
    () => new Set(list.members.map((m) => m.id)),
    [list.members],
  );

  useEffect(() => {
    setPicked((prev) => prev.filter((id) => memberIds.has(id)));
  }, [memberIds]);

  useEffect(() => {
    if (!open) setPicked([]);
  }, [open]);

  const addableCount = selectedIds.filter((id) => !memberIds.has(id)).length;
  const count = list.members.length;
  const pickedCount = picked.length;
  const allPicked = count > 0 && pickedCount === count;

  function togglePick(id: string) {
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function removeMembers(contactIds: string[]) {
    if (contactIds.length === 0) return;
    startTransition(async () => {
      try {
        const result = await removeContactsFromList({
          organizationId,
          orgSlug,
          listId: list.id,
          contactIds,
        });
        toast.success(
          result.removed === 1
            ? "1 contact retiré"
            : `${result.removed} contacts retirés`,
        );
        setPicked((prev) => prev.filter((id) => !contactIds.includes(id)));
        onChanged();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur");
      }
    });
  }

  return (
    <li className="contact-group-row">
      <div className="contact-group-row__main">
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="contact-group-row__open"
                disabled={pending}
                aria-label={`Ouvrir le groupe ${list.name}`}
              />
            }
          >
            <span className="contact-group-row__icon" aria-hidden>
              <UsersIcon className="size-4" />
            </span>
            <span className="contact-group-row__meta">
              <span className="contact-group-row__name">{list.name}</span>
              <span className="contact-group-row__count">
                {count} contact{count === 1 ? "" : "s"}
              </span>
            </span>
            <ChevronDownIcon
              className={`contact-group-row__chevron${open ? " is-open" : ""}`}
              aria-hidden
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={6}
            className="contact-group-menu w-[min(22rem,calc(100vw-2rem))]"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center justify-between gap-2">
                <span>Membres du groupe</span>
                <span className="font-normal text-[var(--fg-muted)]">
                  {count}
                </span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {count === 0 ? (
              <p className="contact-group-menu__empty">
                Aucun contact dans ce groupe.
              </p>
            ) : (
              <>
                <div className="contact-group-menu__toolbar">
                  <button
                    type="button"
                    className="contact-group-menu__select-all"
                    disabled={pending}
                    onClick={() =>
                      setPicked(allPicked ? [] : list.members.map((m) => m.id))
                    }
                  >
                    {allPicked ? "Tout désélectionner" : "Tout sélectionner"}
                  </button>
                  {pickedCount > 0 ? (
                    <button
                      type="button"
                      className="contact-group-menu__bulk-remove"
                      disabled={pending}
                      onClick={() => removeMembers(picked)}
                    >
                      <UserMinusIcon className="size-3.5" aria-hidden />
                      Retirer ({pickedCount})
                    </button>
                  ) : null}
                </div>
                <DropdownMenuGroup className="contact-group-menu__list">
                  {list.members.map((member) => {
                    const label = member.name?.trim() || member.phone;
                    const checked = picked.includes(member.id);
                    return (
                      <DropdownMenuItem
                        key={member.id}
                        closeOnClick={false}
                        className="contact-group-menu__item"
                        onClick={(event) => {
                          event.preventDefault();
                          togglePick(member.id);
                        }}
                      >
                        <input
                          type="checkbox"
                          className="contact-group-menu__check"
                          checked={checked}
                          disabled={pending}
                          aria-label={`Sélectionner ${label}`}
                          onChange={() => togglePick(member.id)}
                          onClick={(event) => event.stopPropagation()}
                        />
                        <span className="contact-group-menu__member">
                          <span className="contact-group-menu__member-name">
                            {label}
                            {member.archivedAt ? (
                              <span className="contact-group-menu__badge">
                                Archivé
                              </span>
                            ) : null}
                          </span>
                          {member.name?.trim() ? (
                            <span className="contact-group-menu__member-phone">
                              {member.phone}
                            </span>
                          ) : null}
                        </span>
                        <button
                          type="button"
                          className="contact-group-menu__remove"
                          disabled={pending}
                          aria-label={`Retirer ${label} du groupe`}
                          title="Retirer du groupe"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            removeMembers([member.id]);
                          }}
                        >
                          <UserMinusIcon className="size-3.5" aria-hidden />
                        </button>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
              </>
            )}
            <DropdownMenuSeparator />
            <div className="contact-group-menu__footer">
              <Button
                type="button"
                size="sm"
                className="w-full"
                disabled={pending || addableCount === 0}
                onClick={() => {
                  const contactIds = selectedIds.filter(
                    (id) => !memberIds.has(id),
                  );
                  if (contactIds.length === 0) {
                    toast.error(
                      "Cochez des contacts dans le tableau pour les ajouter",
                    );
                    return;
                  }
                  startTransition(async () => {
                    try {
                      const result = await addContactsToList({
                        organizationId,
                        orgSlug,
                        listId: list.id,
                        contactIds,
                      });
                      toast.success(
                        result.added === 1
                          ? "1 contact ajouté"
                          : `${result.added} contacts ajoutés`,
                      );
                      onChanged();
                    } catch (err) {
                      toast.error(
                        err instanceof Error ? err.message : "Erreur",
                      );
                    }
                  });
                }}
              >
                <PlusIcon className="size-3.5" aria-hidden />
                {addableCount > 0
                  ? `Ajouter la sélection (${addableCount})`
                  : "Ajouter la sélection"}
              </Button>
              {addableCount === 0 ? (
                <p className="contact-group-menu__hint">
                  Cochez des contacts dans le tableau, puis ajoutez-les ici.
                </p>
              ) : null}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <ConfirmAlertDialogButton
          className="btn btn-danger contact-group-row__delete"
          pending={pending}
          disabled={pending}
          title="Supprimer ce groupe ?"
          description={`« ${list.name} » sera supprimé. Les contacts ne seront pas effacés.`}
          confirmLabel="Supprimer"
          variant="destructive"
          onConfirm={() =>
            startTransition(async () => {
              try {
                await deleteContactList({
                  organizationId,
                  orgSlug,
                  listId: list.id,
                });
                toast.success("Groupe supprimé");
                onChanged();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erreur");
              }
            })
          }
        >
          <Trash2Icon className="size-4" aria-hidden />
          <span className="sr-only">Supprimer le groupe</span>
        </ConfirmAlertDialogButton>
      </div>
    </li>
  );
}

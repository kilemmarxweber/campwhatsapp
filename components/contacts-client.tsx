"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import {
  createContact,
  createContactList,
  deleteContact,
  deleteContactList,
  importContactsFromExcel,
} from "@/lib/contacts/actions";
import { ConfirmAlertDialogButton } from "@/components/confirm-alert-dialog";
import { TablePagination } from "@/components/table-pagination";
import { Button } from "@/components/ui/button";

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function filenameFromContentDisposition(header: string | null, fallback: string) {
  if (!header) return fallback;
  const utf = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf?.[1]) {
    try {
      return decodeURIComponent(utf[1].trim());
    } catch {
      // keep fallback parsing
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1]?.trim() || fallback;
}

export function ContactsClient({
  organizationId,
  orgSlug,
  contacts,
  lists,
  page,
  totalContacts,
}: {
  organizationId: string;
  orgSlug: string;
  contacts: {
    id: string;
    phone: string;
    name: string | null;
    email: string | null;
  }[];
  lists: {
    id: string;
    name: string;
    _count: { members: number };
  }[];
  page: number;
  totalContacts: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [listName, setListName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <form
          className="surface flex flex-col gap-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              try {
                await createContact({
                  organizationId,
                  orgSlug,
                  phone,
                  name: name || undefined,
                });
                toast.success("Contact ajouté");
                setPhone("");
                setName("");
                router.refresh();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erreur");
              }
            });
          }}
        >
          <h2 className="font-medium">Ajouter un contact</h2>
          <div className="field">
            <label>Téléphone</label>
            <input
              required
              placeholder="+243…"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Nom</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <button className="btn btn-primary" disabled={pending} type="submit">
            Ajouter
          </button>
        </form>

        <div className="surface flex flex-col gap-3 p-5">
          <h2 className="font-medium">Import Excel</h2>
          <p className="text-sm text-[var(--fg-muted)]">
            Utilisez le fichier exporté (icône ↓ du tableau) : mêmes colonnes{" "}
            <code>phone</code>, <code>name</code>, <code>email</code> +
            variables. Ne renommez pas les en-têtes.
          </p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              const input = e.currentTarget;
              const file = input.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result;
                if (!(result instanceof ArrayBuffer)) return;
                const base64 = arrayBufferToBase64(result);
                startTransition(async () => {
                  try {
                    const report = await importContactsFromExcel({
                      organizationId,
                      orgSlug,
                      base64,
                      filename: file.name,
                    });
                    toast.success(
                      `${report.created} créés, ${report.updated} maj, ${report.errors.length} erreurs`,
                    );
                    router.refresh();
                  } catch (err) {
                    toast.error(
                      err instanceof Error ? err.message : "Import échoué",
                    );
                  } finally {
                    input.value = "";
                  }
                });
              };
              reader.readAsArrayBuffer(file);
            }}
          />
        </div>
      </div>

      <div className="surface flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-medium">Listes</h2>
            <p className="text-sm text-[var(--fg-muted)]">
              Cochez des contacts puis créez une liste pour les campagnes.
            </p>
          </div>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (selected.length === 0) {
                toast.error("Sélectionnez au moins un contact");
                return;
              }
              startTransition(async () => {
                try {
                  await createContactList({
                    organizationId,
                    orgSlug,
                    name: listName,
                    contactIds: selected,
                  });
                  toast.success("Liste créée");
                  setListName("");
                  setSelected([]);
                  router.refresh();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Erreur");
                }
              });
            }}
          >
            <div className="field">
              <label>Nom de liste</label>
              <input
                required
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="ex. Prospects Kinshasa"
              />
            </div>
            <button className="btn btn-primary" disabled={pending} type="submit">
              Créer ({selected.length})
            </button>
          </form>
        </div>
        {lists.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">
            Aucune liste pour l’instant.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {lists.map((list) => (
              <li
                key={list.id}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2"
              >
                <div>
                  <p className="font-medium">{list.name}</p>
                  <p className="text-sm text-[var(--fg-muted)]">
                    {list._count.members} contact
                    {list._count.members === 1 ? "" : "s"}
                  </p>
                </div>
                <ConfirmAlertDialogButton
                  className="btn btn-danger"
                  pending={pending}
                  disabled={pending}
                  title="Supprimer cette liste ?"
                  description={`« ${list.name} » sera supprimée. Les contacts ne seront pas effacés.`}
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
                        toast.success("Liste supprimée");
                        router.refresh();
                      } catch (err) {
                        toast.error(
                          err instanceof Error ? err.message : "Erreur",
                        );
                      }
                    })
                  }
                >
                  Supprimer
                </ConfirmAlertDialogButton>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="surface overflow-x-auto">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <h2 className="font-medium">Tableau des contacts</h2>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={pending}
            title="Exporter Excel"
            aria-label="Exporter les contacts en Excel"
            onClick={() => {
              startTransition(async () => {
                try {
                  const res = await fetch(
                    `/api/o/${encodeURIComponent(orgSlug)}/contacts/export`,
                    { method: "GET", credentials: "same-origin" },
                  );
                  if (!res.ok) {
                    let message = "Export échoué";
                    try {
                      const body = (await res.json()) as { message?: string };
                      if (body.message) message = body.message;
                    } catch {
                      // ignore
                    }
                    throw new Error(message);
                  }
                  const blob = await res.blob();
                  if (blob.size < 32) {
                    throw new Error("Fichier export vide — réessayez");
                  }
                  const stamp = new Date().toISOString().slice(0, 10);
                  const filename = filenameFromContentDisposition(
                    res.headers.get("Content-Disposition"),
                    `contacts-${orgSlug}-${stamp}.xlsx`,
                  );
                  triggerBlobDownload(blob, filename);
                  const countHeader = res.headers.get("X-Contacts-Count");
                  const count = countHeader ? Number(countHeader) : totalContacts;
                  toast.success(
                    Number.isFinite(count)
                      ? `${count} contact(s) exporté(s)`
                      : "Export téléchargé",
                  );
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Export échoué",
                  );
                }
              });
            }}
          >
            <DownloadIcon />
          </Button>
        </div>
        {contacts.length === 0 && totalContacts === 0 ? (
          <div className="p-8 text-center text-[var(--fg-muted)]">
            Aucun contact — ajoutez-en un ou importez un Excel pour démarrer.
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th className="w-10" />
                  <th>Nom</th>
                  <th>Téléphone</th>
                  <th>Email</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        aria-label={`Sélectionner ${c.name || c.phone}`}
                      />
                    </td>
                    <td>{c.name || "—"}</td>
                    <td className="font-mono text-sm">{c.phone}</td>
                    <td>{c.email || "—"}</td>
                    <td className="text-right">
                      <ConfirmAlertDialogButton
                        className="btn btn-danger"
                        pending={pending}
                        disabled={pending}
                        title="Supprimer ce contact ?"
                        description={`${c.name || c.phone} sera retiré définitivement de la base destinataires.`}
                        confirmLabel="Supprimer"
                        variant="destructive"
                        onConfirm={() =>
                          startTransition(async () => {
                            try {
                              await deleteContact({
                                organizationId,
                                orgSlug,
                                contactId: c.id,
                              });
                              toast.success("Contact supprimé");
                              setSelected((prev) =>
                                prev.filter((id) => id !== c.id),
                              );
                              router.refresh();
                            } catch (err) {
                              toast.error(
                                err instanceof Error ? err.message : "Erreur",
                              );
                            }
                          })
                        }
                      >
                        Supprimer
                      </ConfirmAlertDialogButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePagination
              basePath={`/o/${orgSlug}/contacts`}
              page={page}
              totalItems={totalContacts}
              label="contacts"
            />
          </>
        )}
      </div>
    </div>
  );
}

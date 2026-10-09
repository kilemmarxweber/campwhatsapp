"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DownloadIcon, FolderOpenIcon, SearchIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import type { CountryCode } from "libphonenumber-js";
import {
  createContact,
  createContactList,
  deleteContactList,
  importContactsFromExcel,
  queryContactsPage,
  type ContactRow,
} from "@/lib/contacts/actions";
import { ContactActions } from "@/components/contact-actions";
import { ConfirmAlertDialogButton } from "@/components/confirm-alert-dialog";
import { LoaderCircle, usePendingOverlay } from "@/components/page-loader";
import {
  PhoneInputField,
  resolvePhoneInput,
  type PhoneInputValue,
} from "@/components/phone-input-field";
import { TablePagination } from "@/components/table-pagination";
import { Button } from "@/components/ui/button";
import {
  EMAIL_MAX_LENGTH,
  PERSON_NAME_MAX_LENGTH,
  emailValidationMessage,
  filterEmailInput,
  filterPersonName,
  filterSafeText,
  normalizeEmail,
} from "@/lib/input-security";

function syncContactsUrl(orgSlug: string, q: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  const next = qs
    ? `/o/${orgSlug}/contacts?${qs}`
    : `/o/${orgSlug}/contacts`;
  window.history.replaceState(null, "", next);
}

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
  defaultCountry,
  contacts,
  lists,
  page,
  totalContacts,
  searchQuery = "",
}: {
  organizationId: string;
  orgSlug: string;
  defaultCountry: CountryCode;
  contacts: {
    id: string;
    phone: string;
    name: string | null;
    email: string | null;
    archivedAt: Date | string | null;
  }[];
  lists: {
    id: string;
    name: string;
    _count: { members: number };
  }[];
  page: number;
  totalContacts: number;
  searchQuery?: string;
}) {
  const router = useRouter();
  const { pending, startTransition } = usePendingOverlay();
  const [phoneValue, setPhoneValue] = useState<PhoneInputValue>({
    country: defaultCountry,
    national: "",
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [listName, setListName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState(searchQuery);
  const [appliedQuery, setAppliedQuery] = useState(searchQuery);
  const [tableRows, setTableRows] = useState<ContactRow[]>(contacts);
  const [tableTotal, setTableTotal] = useState(totalContacts);
  const [tablePage, setTablePage] = useState(page);
  const [tableLoading, setTableLoading] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchSkipFirst = useRef(true);
  const fetchSeq = useRef(0);

  useEffect(() => {
    setTableRows(contacts);
    setTableTotal(totalContacts);
    setTablePage(page);
    setAppliedQuery(searchQuery);
    if (document.activeElement !== searchInputRef.current) {
      setSearchDraft(searchQuery);
    }
  }, [contacts, totalContacts, page, searchQuery]);

  async function loadTable(nextQ: string, nextPage: number) {
    const seq = ++fetchSeq.current;
    setTableLoading(true);
    try {
      const result = await queryContactsPage({
        organizationId,
        q: nextQ,
        page: nextPage,
      });
      if (seq !== fetchSeq.current) return;
      setTableRows(result.contacts);
      setTableTotal(result.total);
      setTablePage(result.page);
      setAppliedQuery(nextQ);
      syncContactsUrl(orgSlug, nextQ, result.page);
    } catch (err) {
      if (seq !== fetchSeq.current) return;
      toast.error(err instanceof Error ? err.message : "Recherche échouée");
    } finally {
      if (seq === fetchSeq.current) setTableLoading(false);
    }
  }

  useEffect(() => {
    if (searchSkipFirst.current) {
      searchSkipFirst.current = false;
      return;
    }
    const handle = window.setTimeout(() => {
      const next = searchDraft.trim();
      if (next === appliedQuery) return;
      void loadTable(next, 1);
    }, 280);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce on draft only
  }, [searchDraft]);

  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleImportFile(file: File, input: HTMLInputElement) {
    setImportFileName(file.name);
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
          toast.error(err instanceof Error ? err.message : "Import échoué");
        } finally {
          input.value = "";
          setImportFileName(null);
        }
      });
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <div className="contacts-page flex flex-col gap-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <form
          className="surface contacts-panel flex flex-col gap-2.5 p-3.5"
          onSubmit={(e) => {
            e.preventDefault();
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
                await createContact({
                  organizationId,
                  orgSlug,
                  phone: checked.e164,
                  name: filterPersonName(name) || undefined,
                  email: trimmedEmail
                    ? normalizeEmail(trimmedEmail)
                    : undefined,
                });
                toast.success("Contact ajouté");
                setPhoneValue({ country: phoneValue.country, national: "" });
                setName("");
                setEmail("");
                router.refresh();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erreur");
              }
            });
          }}
        >
          <h2 className="text-sm font-medium">Ajouter un contact</h2>
          <PhoneInputField
            id="contact-phone"
            required
            value={phoneValue}
            onChange={setPhoneValue}
            disabled={pending}
          />
          <div className="contacts-name-email">
            <div className="field field-sm">
              <label htmlFor="contact-name">Nom</label>
              <input
                id="contact-name"
                value={name}
                maxLength={PERSON_NAME_MAX_LENGTH}
                onChange={(e) => setName(filterPersonName(e.target.value))}
                placeholder="Optionnel"
                autoComplete="name"
                spellCheck={false}
              />
            </div>
            <div className="field field-sm">
              <label htmlFor="contact-email">Email</label>
              <input
                id="contact-email"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoComplete="email"
                spellCheck={false}
                maxLength={EMAIL_MAX_LENGTH}
                placeholder="Optionnel"
                value={email}
                onChange={(e) => setEmail(filterEmailInput(e.target.value))}
                onBlur={() => {
                  if (email.trim()) setEmail(normalizeEmail(email));
                }}
              />
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm self-start"
            disabled={pending}
            type="submit"
          >
            Ajouter
          </button>
        </form>

        <div className="surface contacts-panel flex flex-col gap-2.5 p-3.5">
          <h2 className="text-sm font-medium">Import Excel</h2>
          <p className="text-xs leading-relaxed text-[var(--fg-muted)]">
            Utilisez le fichier exporté (↓ du tableau) : colonnes{" "}
            <code>phone</code>, <code>name</code>, <code>email</code> +
            variables.
          </p>
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              const input = e.currentTarget;
              const file = input.files?.[0];
              if (!file) return;
              handleImportFile(file, input);
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={pending}
              onClick={() => importInputRef.current?.click()}
            >
              <FolderOpenIcon className="size-3.5" aria-hidden />
              Parcourir
            </button>
            <span className="truncate text-xs text-[var(--fg-muted)]">
              {importFileName ?? "Aucun fichier sélectionné"}
            </span>
          </div>
        </div>
      </div>

      <div className="surface contacts-panel flex flex-col gap-3 p-3.5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium">Grouper</h2>
            <p className="text-xs text-[var(--fg-muted)]">
              Cochez des contacts puis créez un groupe pour les campagnes.
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
                  toast.success("Groupe créé");
                  setListName("");
                  setSelected([]);
                  router.refresh();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Erreur");
                }
              });
            }}
          >
            <div className="field field-sm">
              <label htmlFor="list-name">Nom du groupe</label>
              <input
                id="list-name"
                required
                maxLength={120}
                value={listName}
                onChange={(e) => setListName(filterSafeText(e.target.value, 120))}
                placeholder="ex. Prospects Kinshasa"
                spellCheck={false}
              />
            </div>
            <button
              className="btn btn-primary btn-sm"
              disabled={pending}
              type="submit"
            >
              Créer ({selected.length})
            </button>
          </form>
        </div>
        {lists.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">
            Aucun groupe pour l’instant.
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
                  className="btn btn-danger btn-sm"
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
        <div className="contacts-table-toolbar">
          <h2 className="text-sm font-medium">Tableau des contacts</h2>
          <div className="contacts-table-actions">
            <div className="contacts-search">
              <SearchIcon className="contacts-search-icon" aria-hidden />
              <input
                ref={searchInputRef}
                type="search"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Rechercher nom ou numéro…"
                aria-label="Rechercher un contact par nom ou numéro"
                aria-busy={tableLoading}
              />
              {searchDraft ? (
                <button
                  type="button"
                  className="contacts-search-clear"
                  aria-label="Effacer la recherche"
                  onClick={() => {
                    setSearchDraft("");
                    searchInputRef.current?.focus();
                  }}
                >
                  <XIcon className="size-3.5" />
                </button>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="contacts-export-btn"
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
                    const count = countHeader
                      ? Number(countHeader)
                      : tableTotal;
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
        </div>
        {tableRows.length === 0 && tableTotal === 0 ? (
          <div
            className={`p-8 text-center text-[var(--fg-muted)] ${
              tableLoading ? "contacts-table-loading" : ""
            }`}
          >
            {tableLoading ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="size-5" />
                Recherche…
              </span>
            ) : appliedQuery ? (
              `Aucun contact ne correspond à « ${appliedQuery} ».`
            ) : (
              "Aucun contact — ajoutez-en un ou importez un Excel pour démarrer."
            )}
          </div>
        ) : (
          <>
            <div
              className={
                tableLoading
                  ? "contacts-table-body is-loading"
                  : "contacts-table-body"
              }
              aria-busy={tableLoading}
            >
              {tableLoading ? (
                <div
                  className="contacts-table-spinner"
                  role="status"
                  aria-live="polite"
                >
                  <LoaderCircle className="size-7" />
                </div>
              ) : null}
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
                {tableRows.map((c) => {
                  const archived = Boolean(c.archivedAt);
                  return (
                    <tr
                      key={c.id}
                      className={archived ? "opacity-60" : undefined}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.includes(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          disabled={archived}
                          aria-label={`Sélectionner ${c.name || c.phone}`}
                        />
                      </td>
                      <td>
                        <span className="inline-flex flex-wrap items-center gap-2">
                          {c.name || "—"}
                          {archived ? (
                            <span className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--fg-muted)]">
                              Archivé
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td className="font-mono text-sm">{c.phone}</td>
                      <td>{c.email || "—"}</td>
                      <td className="text-right">
                        <ContactActions
                          organizationId={organizationId}
                          orgSlug={orgSlug}
                          defaultCountry={defaultCountry}
                          contact={{
                            id: c.id,
                            phone: c.phone,
                            name: c.name,
                            email: c.email,
                            archivedAt: c.archivedAt
                              ? String(c.archivedAt)
                              : null,
                          }}
                          onDeleted={(id) =>
                            setSelected((prev) => prev.filter((x) => x !== id))
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            <TablePagination
              basePath={`/o/${orgSlug}/contacts`}
              page={tablePage}
              totalItems={tableTotal}
              label="contacts"
              query={{ q: appliedQuery || undefined }}
              onPageChange={(nextPage) => {
                void loadTable(appliedQuery, nextPage);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

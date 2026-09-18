"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createContact,
  importContactsFromExcel,
} from "@/lib/contacts/actions";

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function ContactsClient({
  organizationId,
  orgSlug,
  contacts,
}: {
  organizationId: string;
  orgSlug: string;
  contacts: {
    id: string;
    phone: string;
    name: string | null;
    email: string | null;
  }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");

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
            Colonnes : <code>phone</code> (obligatoire), <code>name</code>,{" "}
            <code>email</code>, plus variables libres.
          </p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
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
                  }
                });
              };
              reader.readAsArrayBuffer(file);
            }}
          />
        </div>
      </div>

      <div className="surface overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Téléphone</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-[var(--fg-muted)]">
                  Aucun contact
                </td>
              </tr>
            ) : (
              contacts.map((c) => (
                <tr key={c.id}>
                  <td>{c.name || "—"}</td>
                  <td className="font-mono text-sm">{c.phone}</td>
                  <td>{c.email || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

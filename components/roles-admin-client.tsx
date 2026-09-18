"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteGlobalRole,
  upsertGlobalRole,
} from "@/lib/roles/actions";
import { businessAccessControlStatements } from "@/lib/permissions";
import type { PermissionMatrix } from "@/lib/roles/permission-matrix";
import { parsePermission } from "@/lib/roles/permission-matrix";

type RoleRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  permission: string;
  isSystem: boolean;
};

const RESOURCES = Object.entries(businessAccessControlStatements) as [
  keyof typeof businessAccessControlStatements,
  readonly string[],
][];

const RESOURCE_LABELS: Record<string, string> = {
  contacts: "Contacts",
  campaigns: "Campagnes",
  media: "Médias",
  templates: "Templates",
  klambo: "Klambo",
  equipe: "Équipe",
};

export function RolesAdminClient({ roles }: { roles: RoleRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<{
    id?: string;
    name: string;
    description: string;
    permission: PermissionMatrix;
    isSystem: boolean;
    slug: string;
  } | null>(null);

  function openEdit(id: string | "new") {
    if (id === "new") {
      setDraft({
        id: undefined,
        name: "",
        description: "",
        permission: Object.fromEntries(
          RESOURCES.map(([k]) => [k, [] as string[]]),
        ) as PermissionMatrix,
        isSystem: false,
        slug: "",
      });
    } else {
      const row = roles.find((r) => r.id === id);
      if (!row) return;
      setDraft({
        id: row.id,
        name: row.name,
        description: row.description ?? "",
        permission: parsePermission(row.permission),
        isSystem: row.isSystem,
        slug: row.slug,
      });
    }
  }

  function toggle(resource: string, action: string) {
    if (!draft) return;
    const current = draft.permission[resource] ?? [];
    const next = current.includes(action)
      ? current.filter((a) => a !== action)
      : [...current, action];
    setDraft({
      ...draft,
      permission: { ...draft.permission, [resource]: next },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--tvs-blue-deep)]">
            Rôles & permissions
          </h1>
          <p className="mt-1 text-[var(--fg-muted)]">
            Définis au siège — répercutés sur toutes les succursales.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => openEdit("new")}
        >
          Nouveau rôle
        </button>
      </div>

      <div className="surface overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Rôle</th>
              <th>Slug</th>
              <th>Type</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id}>
                <td>
                  <p className="font-medium">{role.name}</p>
                  {role.description ? (
                    <p className="text-sm text-[var(--fg-muted)]">
                      {role.description}
                    </p>
                  ) : null}
                </td>
                <td className="font-mono text-sm">{role.slug}</td>
                <td>
                  <span className={role.isSystem ? "badge badge-ok" : "badge"}>
                    {role.isSystem ? "Système" : "Custom"}
                  </span>
                </td>
                <td className="text-right">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => openEdit(role.id)}
                  >
                    Modifier
                  </button>
                  {!role.isSystem ? (
                    <button
                      type="button"
                      className="btn btn-danger ml-2"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          try {
                            await deleteGlobalRole(role.id);
                            toast.success("Rôle supprimé");
                            router.refresh();
                          } catch (err) {
                            toast.error(
                              err instanceof Error ? err.message : "Erreur",
                            );
                          }
                        });
                      }}
                    >
                      Supprimer
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {draft ? (
        <div className="surface flex flex-col gap-4 p-6">
          <h2 className="text-lg font-medium">
            {draft.id ? "Modifier le rôle" : "Nouveau rôle"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="field">
              <label>Nom</label>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Description</label>
              <input
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Ressource</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {RESOURCES.map(([resource, actions]) => (
                  <tr key={resource}>
                    <td className="font-medium">
                      {RESOURCE_LABELS[resource] ?? resource}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-3">
                        {actions.map((action) => {
                          const checked = (
                            draft.permission[resource] ?? []
                          ).includes(action);
                          return (
                            <label
                              key={action}
                              className="flex items-center gap-1.5 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggle(resource, action)}
                              />
                              {action}
                            </label>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  try {
                    await upsertGlobalRole({
                      id: draft.id,
                      name: draft.name,
                      description: draft.description,
                      permission: draft.permission,
                    });
                    toast.success("Rôle enregistré — répercuté sur les succursales");
                    setDraft(null);
                    router.refresh();
                  } catch (err) {
                    toast.error(
                      err instanceof Error ? err.message : "Erreur",
                    );
                  }
                });
              }}
            >
              Enregistrer
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setDraft(null)}
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

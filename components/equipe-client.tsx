"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  cancelInvitation,
  inviteToSuccursale,
  removeMember,
  updateMemberRole,
} from "@/lib/succursales/actions";

type MemberRow = {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
};

type InvitationRow = {
  id: string;
  email: string;
  role: string | null;
  status: string;
};

export function EquipeClient({
  organizationId,
  orgSlug,
  members,
  invitations,
  roles,
  canManage,
}: {
  organizationId: string;
  orgSlug: string;
  members: MemberRow[];
  invitations: InvitationRow[];
  roles: { slug: string; name: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(roles[0]?.slug ?? "user");

  return (
    <div className="flex flex-col gap-8">
      {canManage ? (
        <form
          className="surface flex max-w-xl flex-col gap-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              try {
                await inviteToSuccursale({
                  organizationId,
                  orgSlug,
                  email,
                  role,
                });
                toast.success("Invitation créée");
                setEmail("");
                router.refresh();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erreur");
              }
            });
          }}
        >
          <h2 className="font-medium">Inviter un collègue</h2>
          <p className="text-sm text-[var(--fg-muted)]">
            Le rôle vient du catalogue siège — mêmes droits dans toutes les
            succursales.
          </p>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="collegue@tvsrdcongo.com"
            />
          </div>
          <div className="field">
            <label>Rôle</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              {roles.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" disabled={pending} type="submit">
            Inviter
          </button>
        </form>
      ) : null}

      <div className="surface overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Membre</th>
              <th>Rôle</th>
              {canManage ? <th /> : null}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>
                  <p className="font-medium">{m.user.name}</p>
                  <p className="text-sm text-[var(--fg-muted)]">
                    {m.user.email}
                  </p>
                </td>
                <td>
                  {canManage ? (
                    <select
                      className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
                      value={m.role}
                      disabled={pending}
                      onChange={(e) => {
                        const next = e.target.value;
                        startTransition(async () => {
                          try {
                            await updateMemberRole({
                              organizationId,
                              orgSlug,
                              memberId: m.id,
                              role: next,
                            });
                            toast.success("Rôle mis à jour");
                            router.refresh();
                          } catch (err) {
                            toast.error(
                              err instanceof Error ? err.message : "Erreur",
                            );
                          }
                        });
                      }}
                    >
                      {roles.map((r) => (
                        <option key={r.slug} value={r.slug}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="badge">{m.role}</span>
                  )}
                </td>
                {canManage ? (
                  <td className="text-right">
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          try {
                            await removeMember({
                              organizationId,
                              orgSlug,
                              memberIdOrEmail: m.id,
                            });
                            toast.success("Membre retiré");
                            router.refresh();
                          } catch (err) {
                            toast.error(
                              err instanceof Error ? err.message : "Erreur",
                            );
                          }
                        });
                      }}
                    >
                      Retirer
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invitations.length > 0 ? (
        <div className="surface overflow-hidden">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h2 className="font-medium">Invitations en attente</h2>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Rôle</th>
                <th>Statut</th>
                {canManage ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.email}</td>
                  <td>
                    <span className="badge">{inv.role ?? "user"}</span>
                  </td>
                  <td>{inv.status}</td>
                  {canManage ? (
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={pending}
                        onClick={() => {
                          startTransition(async () => {
                            try {
                              await cancelInvitation({
                                organizationId,
                                orgSlug,
                                invitationId: inv.id,
                              });
                              toast.success("Invitation annulée");
                              router.refresh();
                            } catch (err) {
                              toast.error(
                                err instanceof Error ? err.message : "Erreur",
                              );
                            }
                          });
                        }}
                      >
                        Annuler
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

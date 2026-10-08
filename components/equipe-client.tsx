"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EllipsisIcon, KeyRoundIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { isOwnerOrgRole } from "@/lib/permissions";
import {
  createSuccursaleMember,
  removeMember,
  resetMemberPassword,
  updateSuccursaleMember,
} from "@/lib/succursales/actions";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type MemberRow = {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
};

type RoleOption = { slug: string; name: string };

function roleLabel(roles: RoleOption[], slug: string) {
  if (isOwnerOrgRole(slug)) return "Propriétaire";
  return roles.find((item) => item.slug === slug)?.name ?? slug;
}

function defaultRole(roles: RoleOption[]) {
  return roles.find((item) => item.slug === "user")?.slug ?? roles[0]?.slug ?? "user";
}

export function EquipeClient({
  organizationId,
  orgSlug,
  members,
  roles,
  canManage,
}: {
  organizationId: string;
  orgSlug: string;
  members: MemberRow[];
  roles: RoleOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(defaultRole(roles));

  function reset() {
    setName("");
    setEmail("");
    setRole(defaultRole(roles));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-xl text-sm text-muted-foreground">
          Le compte est créé tout de suite. Les identifiants partent par email
          à la même adresse.
        </p>
        {canManage ? (
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
                      await createSuccursaleMember({
                        organizationId,
                        orgSlug,
                        name,
                        email,
                        role,
                      });
                      toast.success("Membre créé. Email envoyé.");
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
                  <DialogTitle>Nouveau membre</DialogTitle>
                  <DialogDescription>
                    Un mot de passe temporaire est envoyé à cette adresse email.
                  </DialogDescription>
                </DialogHeader>
                <MemberFields
                  idPrefix="member"
                  name={name}
                  email={email}
                  role={role}
                  roles={roles}
                  onName={setName}
                  onEmail={setEmail}
                  onRole={setRole}
                />
                <DialogFooter>
                  <Button type="submit" disabled={pending}>
                    {pending ? "Création…" : "Ajouter"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <div className="surface overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Membre</th>
              <th>Rôle</th>
              {canManage ? <th className="text-right">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 3 : 2} className="text-[var(--fg-muted)]">
                  Aucun membre pour le moment.
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id}>
                  <td>
                    <p className="font-medium">{member.user.name}</p>
                    <p className="text-sm text-[var(--fg-muted)]">{member.user.email}</p>
                  </td>
                  <td>
                    <span className="badge">{roleLabel(roles, member.role)}</span>
                  </td>
                  {canManage ? (
                    <td className="text-right">
                      <MemberActions
                        organizationId={organizationId}
                        orgSlug={orgSlug}
                        member={member}
                        roles={roles}
                      />
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MemberFields({
  idPrefix,
  name,
  email,
  role,
  roles,
  showRole = true,
  onName,
  onEmail,
  onRole,
}: {
  idPrefix: string;
  name: string;
  email: string;
  role: string;
  roles: RoleOption[];
  showRole?: boolean;
  onName: (value: string) => void;
  onEmail: (value: string) => void;
  onRole: (value: string) => void;
}) {
  return (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-name`}>Nom</label>
        <input
          id={`${idPrefix}-name`}
          required
          value={name}
          onChange={(event) => onName(event.target.value)}
          placeholder="ex. Marie Kalala"
        />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-email`}>Email</label>
        <input
          id={`${idPrefix}-email`}
          type="email"
          required
          value={email}
          onChange={(event) => onEmail(event.target.value)}
          placeholder="marie@exemple.com"
        />
      </div>
      {showRole ? (
        <div className="field">
          <label htmlFor={`${idPrefix}-role`}>Rôle</label>
          <select
            id={`${idPrefix}-role`}
            value={role}
            onChange={(event) => onRole(event.target.value)}
          >
            {roles.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </>
  );
}

function MemberActions({
  organizationId,
  orgSlug,
  member,
  roles,
}: {
  organizationId: string;
  orgSlug: string;
  member: MemberRow;
  roles: RoleOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(member.user.name);
  const [email, setEmail] = useState(member.user.email);
  const [role, setRole] = useState(
    roles.some((item) => item.slug === member.role) ? member.role : defaultRole(roles),
  );

  function openEdit() {
    setName(member.user.name);
    setEmail(member.user.email);
    setRole(
      roles.some((item) => item.slug === member.role) ? member.role : defaultRole(roles),
    );
    setEditOpen(true);
  }

  const label = member.user.name || member.user.email;
  const isOwner = isOwnerOrgRole(member.role);

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
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={openEdit}>
              <PencilIcon />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setResetOpen(true)}>
              <KeyRoundIcon />
              Réinitialiser le mot de passe
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {isOwner ? null : (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2Icon />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                try {
                  await updateSuccursaleMember({
                    organizationId,
                    orgSlug,
                    memberId: member.id,
                    name,
                    email,
                    role,
                  });
                  toast.success("Membre mis à jour");
                  setEditOpen(false);
                  router.refresh();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Erreur");
                }
              });
            }}
          >
            <DialogHeader className="pr-8">
              <DialogTitle>Modifier le membre</DialogTitle>
              <DialogDescription>
                Nom, email et rôle de {label}.
              </DialogDescription>
            </DialogHeader>
            <MemberFields
              idPrefix={`edit-${member.id}`}
              name={name}
              email={email}
              role={isOwner ? member.role : role}
              roles={roles}
              showRole={!isOwner}
              onName={setName}
              onEmail={setEmail}
              onRole={setRole}
            />
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser le mot de passe ?</AlertDialogTitle>
            <AlertDialogDescription>
              Un email de réinitialisation sera envoyé à {member.user.email}. Le lien
              est valable 1 heure.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() => {
                setResetOpen(false);
                startTransition(async () => {
                  try {
                    await resetMemberPassword({
                      organizationId,
                      orgSlug,
                      memberId: member.id,
                    });
                    toast.success("Email de réinitialisation envoyé");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Erreur");
                  }
                });
              }}
            >
              {pending ? "…" : "Envoyer l'email"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              {label} n’aura plus accès à cette succursale.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={() => {
                setDeleteOpen(false);
                startTransition(async () => {
                  try {
                    await removeMember({
                      organizationId,
                      orgSlug,
                      memberIdOrEmail: member.id,
                    });
                    toast.success("Membre supprimé");
                    router.refresh();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Erreur");
                  }
                });
              }}
            >
              {pending ? "…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

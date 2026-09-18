import Link from "next/link";
import prisma from "@/lib/prisma";
import { isKlamboConfigured } from "@/lib/klambo/org";

export default async function AdminHomePage() {
  const [orgCount, roleCount, userCount, klamboOk] = await Promise.all([
    prisma.organization.count(),
    prisma.globalRole.count(),
    prisma.user.count(),
    isKlamboConfigured(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--tvs-blue-deep)]">
          Siège TVS
        </h1>
        <p className="mt-1 text-[var(--fg-muted)]">
          Pilotage des succursales, WhatsApp, rôles et gouvernance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface p-5">
          <p className="text-sm text-[var(--fg-muted)]">Succursales</p>
          <p className="mt-1 text-3xl font-semibold text-[var(--tvs-blue)]">
            {orgCount}
          </p>
        </div>
        <div className="surface p-5">
          <p className="text-sm text-[var(--fg-muted)]">WhatsApp</p>
          <p className="mt-2">
            <span className={klamboOk ? "badge badge-ok" : "badge badge-warn"}>
              {klamboOk ? "Connecté" : "À configurer"}
            </span>
          </p>
        </div>
        <div className="surface p-5">
          <p className="text-sm text-[var(--fg-muted)]">Rôles catalogue</p>
          <p className="mt-1 text-3xl font-semibold text-[var(--tvs-blue)]">
            {roleCount}
          </p>
        </div>
        <div className="surface p-5">
          <p className="text-sm text-[var(--fg-muted)]">Utilisateurs</p>
          <p className="mt-1 text-3xl font-semibold text-[var(--tvs-blue)]">
            {userCount}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/klambo" className="btn btn-primary">
          Configurer WhatsApp
        </Link>
        <Link href="/admin/succursales" className="btn btn-ghost">
          Gérer les succursales
        </Link>
        <Link href="/admin/roles" className="btn btn-ghost">
          Rôles & permissions
        </Link>
      </div>
    </div>
  );
}

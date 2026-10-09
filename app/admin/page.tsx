import Link from "next/link";
import prisma from "@/lib/prisma";
export default async function AdminHomePage() {
  const [orgCount, roleCount, userCount, tenantCount, klamboCount, smsCount] =
    await Promise.all([
      prisma.organization.count(),
      prisma.globalRole.count(),
      prisma.user.count(),
      prisma.tenantOrganization.count(),
      prisma.klamboConfig.count(),
      prisma.infobipSmsConfig.count(),
    ]);
  const klamboOk = tenantCount > 0 && klamboCount === tenantCount;
  const smsOk = tenantCount > 0 && smsCount === tenantCount;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--tvs-blue-deep)]">
          Siège
        </h1>
        <p className="mt-1 text-[var(--fg-muted)]">
          Pilotage des succursales, WhatsApp, SMS, rôles et gouvernance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
              {klamboCount}/{tenantCount}
            </span>
          </p>
        </div>
        <div className="surface p-5">
          <p className="text-sm text-[var(--fg-muted)]">SMS</p>
          <p className="mt-2">
            <span className={smsOk ? "badge badge-ok" : "badge badge-warn"}>
              {smsCount}/{tenantCount}
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
        <Link href="/admin/sms" className="btn btn-ghost">
          Configurer SMS
        </Link>
        <Link href="/organisations" className="btn btn-ghost">
          Organisations et succursales
        </Link>
        <Link href="/admin/roles" className="btn btn-ghost">
          Rôles & permissions
        </Link>
      </div>
    </div>
  );
}

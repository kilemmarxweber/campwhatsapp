import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { isAppAdminRole } from "@/lib/permissions";
import { isKlamboConfigured } from "@/lib/klambo/org";

export default async function OrgSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const isSiege = isAppAdminRole(session?.user?.role);
  const configured = await isKlamboConfigured();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--tvs-blue-deep)]">
          Paramètres
        </h1>
        <p className="text-[var(--fg-muted)]">
          Réglages de la succursale
        </p>
      </div>

      <div className="surface flex max-w-xl flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-[var(--tvs-blue-deep)]">
              WhatsApp
            </h2>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              La connexion Klambo est gérée au siège pour toutes les
              succursales.
            </p>
          </div>
          <span className={configured ? "badge badge-ok" : "badge badge-warn"}>
            {configured ? "Connecté" : "Non configuré"}
          </span>
        </div>
        {isSiege ? (
          <Link href="/admin/klambo" className="btn btn-primary w-fit">
            Ouvrir Siège → WhatsApp
          </Link>
        ) : (
          <p className="text-sm text-[var(--fg-muted)]">
            Contactez un administrateur siège pour configurer la clé API.
          </p>
        )}
      </div>
    </div>
  );
}

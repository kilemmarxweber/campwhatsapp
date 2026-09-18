import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listUserOrganizations } from "@/lib/auth/org-membership";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/sign-in");

  const orgs = await listUserOrganizations(session.user.id);

  if (orgs.length === 1) {
    redirect(`/o/${orgs[0].slug}`);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="brand-mark mb-1 text-sm uppercase tracking-[0.16em]">
            <span className="tvs">TVS</span>
            <span className="motors">Motors</span>
          </p>
          <h1 className="text-3xl font-semibold text-[var(--tvs-blue-deep)]">
            Bonjour, {session.user.name}
          </h1>
          <p className="mt-1 text-[var(--fg-muted)]">
            Choisissez une organisation ou créez-en une.
          </p>
        </div>
        <SignOutButton />
      </div>

      <div className="mb-6 flex justify-end">
        <Link href="/onboarding" className="btn btn-primary">
          Nouvelle organisation
        </Link>
      </div>

      {orgs.length === 0 ? (
        <div className="surface p-8 text-center text-[var(--fg-muted)]">
          Aucune organisation. Créez la première pour commencer.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orgs.map((org) => (
            <li key={org.id}>
              <Link
                href={`/o/${org.slug}`}
                className="surface flex items-center justify-between p-4 transition hover:border-[var(--accent)]"
              >
                <div>
                  <p className="font-medium">{org.name}</p>
                  <p className="text-sm text-[var(--fg-muted)]">/{org.slug}</p>
                </div>
                <span className="badge">{org.role}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

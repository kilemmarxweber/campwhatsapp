import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getOrganizationBySlug,
  requireOrgMembership,
} from "@/lib/auth/organization-permission";
import { SignOutButton } from "@/components/sign-out-button";

const NAV = [
  { href: "", label: "Vue d'ensemble" },
  { href: "/contacts", label: "Contacts" },
  { href: "/campaigns", label: "Campagnes" },
  { href: "/media", label: "Médias" },
  { href: "/templates", label: "Templates" },
  { href: "/settings", label: "Paramètres" },
];

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/sign-in");

  const org = await getOrganizationBySlug(orgSlug);
  if (!org) notFound();

  try {
    await requireOrgMembership(org.id);
  } catch {
    redirect("/dashboard");
  }

  await auth.api.setActiveOrganization({
    headers: await headers(),
    body: { organizationId: org.id },
  }).catch(() => undefined);

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--bg-elevated)_90%,transparent)] backdrop-blur">
        <div
          className="h-1 w-full"
          style={{
            background:
              "linear-gradient(90deg, var(--tvs-blue) 0%, var(--tvs-blue) 55%, var(--tvs-red) 55%, var(--tvs-red) 100%)",
          }}
        />
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="brand-mark text-base uppercase">
              <span className="tvs">TVS</span>
              <span className="motors">Motors</span>
            </Link>
            <div>
              <p className="text-sm font-medium">{org.name}</p>
              <p className="text-xs text-[var(--fg-muted)]">/{org.slug}</p>
            </div>
          </div>
          <SignOutButton />
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6 pb-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={`/o/${orgSlug}${item.href}`}
              className="rounded-md px-3 py-1.5 text-sm text-[var(--fg-muted)] hover:bg-[var(--tvs-blue-soft)] hover:text-[var(--tvs-blue)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAppAdminRole } from "@/lib/permissions";
import { AppHeader } from "@/components/app-header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/sign-in");
  if (!isAppAdminRole(session.user.role)) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <AppHeader
        title="Siège"
        subtitle="Administration entreprise"
        showSiegeLink={false}
        contextLabel="Siège"
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          role: session.user.role,
        }}
        navItems={[
          { href: "/admin", label: "Vue d'ensemble" },
          { href: "/admin/klambo", label: "WhatsApp" },
          { href: "/admin/roles", label: "Rôles" },
          { href: "/admin/succursales", label: "Succursales" },
        ]}
      />
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

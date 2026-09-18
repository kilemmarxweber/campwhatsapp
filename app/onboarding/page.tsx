import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAppAdminRole } from "@/lib/permissions";

/** Ancienne route — la création de succursale se fait au siège. */
export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/sign-in");
  if (isAppAdminRole(session.user.role)) {
    redirect("/admin/succursales");
  }
  redirect("/dashboard");
}

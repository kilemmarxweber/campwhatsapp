import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getGovernanceLevel } from "@/lib/auth/governance";

/** Ancienne route — propriétaires et administrateurs arrivent sur leurs organisations. */
export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/sign-in");
  const level = await getGovernanceLevel(session.user.id, session.user.role);
  if (level) redirect("/organisations");
  redirect("/dashboard");
}

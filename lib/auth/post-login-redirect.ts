import { getGovernanceLevel } from "@/lib/auth/governance";
import { listUserOrganizations } from "@/lib/auth/org-membership";

export function safeInternalPath(value: string | null | undefined) {
  if (!value) return null;
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return null;
  if (path.startsWith("/auth")) return null;
  return path;
}

export async function resolvePostLoginPath(
  userId: string,
  appRole: string | null | undefined,
  callbackUrl?: string | null,
) {
  const callback = safeInternalPath(callbackUrl);
  if (callback) return callback;

  const level = await getGovernanceLevel(userId, appRole);
  if (level) return "/organisations";

  const orgs = await listUserOrganizations(userId);
  if (orgs.length === 1) return `/o/${orgs[0].slug}`;
  return "/dashboard";
}

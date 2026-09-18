import { businessAccessControlStatements } from "@/lib/permissions";

export type PermissionMatrix = Record<string, string[]>;

export function serializePermission(permission: PermissionMatrix): string {
  return JSON.stringify(permission);
}

export function parsePermission(raw: string): PermissionMatrix {
  try {
    const parsed = JSON.parse(raw) as PermissionMatrix;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Permissions métier par défaut pour un nouveau rôle custom. */
export function emptyBusinessPermission(): PermissionMatrix {
  return Object.fromEntries(
    Object.keys(businessAccessControlStatements).map((k) => [k, [] as string[]]),
  );
}

import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc as adminPluginAdminAc,
  defaultStatements as adminPluginSchemaStatements,
  userAc as adminPluginUserAc,
} from "better-auth/plugins/admin/access";
import {
  adminAc as organizationPluginAdminAc,
  defaultStatements as organizationPluginSchemaStatements,
  ownerAc,
  memberAc as organizationPluginMemberAc,
} from "better-auth/plugins/organization/access";

export const APP_ROLE = {
  ADMIN: "admin",
  USER: "user",
} as const;

export function isAppAdminRole(role: string | null | undefined): boolean {
  return role === APP_ROLE.ADMIN;
}

export const ORG_ROLE = {
  OWNER: "owner",
  ADMIN: "admin",
  USER: "user",
} as const;

export const ALL_ORG_ROLE_SLUGS = [
  ORG_ROLE.OWNER,
  ORG_ROLE.ADMIN,
  ORG_ROLE.USER,
] as const;

export function normalizeOrgRole(
  raw: string | null | undefined,
): (typeof ALL_ORG_ROLE_SLUGS)[number] | string {
  const r = (raw ?? "").trim().toLowerCase();
  if (!r) return ORG_ROLE.USER;
  if (r === ORG_ROLE.OWNER) return ORG_ROLE.OWNER;
  if (r === ORG_ROLE.ADMIN) return ORG_ROLE.ADMIN;
  if (r === ORG_ROLE.USER) return ORG_ROLE.USER;
  // Rôles custom du catalogue siège — conserver le slug
  return r;
}

/** Ressources métier TVS (campagnes WhatsApp). */
export const businessAccessControlStatements = {
  contacts: ["create", "read", "update", "delete", "import"],
  campaigns: ["create", "read", "update", "delete", "send"],
  media: ["create", "read", "delete"],
  templates: ["create", "read", "update", "delete"],
  klambo: ["read", "update"],
  equipe: ["manage", "read"],
} as const;

export const accessControlStatements = {
  ...adminPluginSchemaStatements,
  ...organizationPluginSchemaStatements,
  ...businessAccessControlStatements,
} as const;

type StatementShape = {
  [K in keyof typeof accessControlStatements]?: ReadonlyArray<
    (typeof accessControlStatements)[K][number]
  >;
};

export const applicationRoleStatements: Record<string, StatementShape> = {
  [APP_ROLE.ADMIN]: {
    ...adminPluginAdminAc.statements,
    ...organizationPluginAdminAc.statements,
  },
  [APP_ROLE.USER]: {
    ...adminPluginUserAc.statements,
  },
};

export const organizationRoleStatements: Record<string, StatementShape> = {
  [ORG_ROLE.OWNER]: {
    ...ownerAc.statements,
    contacts: ["create", "read", "update", "delete", "import"],
    campaigns: ["create", "read", "update", "delete", "send"],
    media: ["create", "read", "delete"],
    templates: ["create", "read", "update", "delete"],
    klambo: ["read", "update"],
    equipe: ["manage", "read"],
  },
  [ORG_ROLE.ADMIN]: {
    ...organizationPluginMemberAc.statements,
    ...organizationPluginAdminAc.statements,
    contacts: ["create", "read", "update", "delete", "import"],
    campaigns: ["create", "read", "update", "delete", "send"],
    media: ["create", "read", "delete"],
    templates: ["create", "read", "update", "delete"],
    klambo: ["read", "update"],
    equipe: ["manage", "read"],
  },
  [ORG_ROLE.USER]: {
    ...organizationPluginMemberAc.statements,
    contacts: ["create", "read", "update", "import"],
    campaigns: ["create", "read", "send"],
    media: ["create", "read"],
    templates: ["create", "read", "update"],
    klambo: ["read"],
    equipe: ["read"],
  },
};

const authAccessControl = createAccessControl(accessControlStatements);

type NewPluginRoleArg = Parameters<typeof authAccessControl.newRole>[0];

function rolesFromStatements(defs: Record<string, StatementShape>) {
  return Object.fromEntries(
    Object.entries(defs).map(([role, statements]) => [
      role,
      authAccessControl.newRole(statements as NewPluginRoleArg),
    ]),
  );
}

export const applicationRoles = rolesFromStatements(applicationRoleStatements);
export const organizationRoles = rolesFromStatements(organizationRoleStatements);
export { authAccessControl };

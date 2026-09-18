import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, customSession, organization } from "better-auth/plugins";
import prisma from "@/lib/prisma";
import {
  assertUserCanJoinOrganization,
  getSessionOrganizationContext,
} from "@/lib/auth/org-membership";
import {
  APP_ROLE,
  ORG_ROLE,
  applicationRoles,
  authAccessControl,
  isAppAdminRole,
  organizationRoles,
} from "@/lib/permissions";
import {
  seedSystemGlobalRoles,
  syncAllGlobalRolesToOrg,
} from "@/lib/roles/sync";

const authOptions = {
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 6,
    maxPasswordLength: 256,
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  plugins: [
    admin({
      ac: authAccessControl,
      defaultRole: APP_ROLE.USER,
      adminRoles: [APP_ROLE.ADMIN],
      roles: applicationRoles,
    }),
    organization({
      ac: authAccessControl,
      creatorRole: ORG_ROLE.OWNER,
      allowUserToCreateOrganization: async (user) => {
        return isAppAdminRole(user.role);
      },
      organizationLimit: async () => false,
      dynamicAccessControl: {
        enabled: true,
      },
      roles: organizationRoles,
      // En prod : brancher un vrai SMTP. En local : invitation créée quand même.
      sendInvitationEmail: async (data) => {
        console.info(
          `[invite] ${data.email} → ${data.organization.name} (${data.invitation.role})`,
        );
      },
      organizationHooks: {
        beforeAddMember: async ({ user, organization }) => {
          await assertUserCanJoinOrganization(user.id, organization.id);
        },
        beforeAcceptInvitation: async ({ user, organization }) => {
          await assertUserCanJoinOrganization(user.id, organization.id);
        },
        afterCreateOrganization: async ({ organization }) => {
          await seedSystemGlobalRoles();
          await syncAllGlobalRolesToOrg(organization.id);
        },
      },
    }),
  ],
} satisfies BetterAuthOptions;

export const auth = betterAuth({
  ...authOptions,
  plugins: [
    ...(authOptions.plugins ?? []),
    customSession(async ({ user, session }) => {
      const organizationCtx = await getSessionOrganizationContext(
        user.id,
        session.activeOrganizationId,
      );
      return {
        user,
        session,
        organization: organizationCtx,
      };
    }, authOptions),
  ],
});

export type Session = typeof auth.$Infer.Session;

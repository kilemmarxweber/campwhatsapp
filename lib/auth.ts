import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin, customSession, organization } from "better-auth/plugins";
import prisma from "@/lib/prisma";
import {
  assertUserCanJoinOrganization,
  ensureTenantMembership,
  getSessionOrganizationContext,
} from "@/lib/auth/org-membership";
import { getGovernanceLevel } from "@/lib/auth/governance";
import {
  APP_ROLE,
  ORG_ROLE,
  applicationRoles,
  authAccessControl,
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
  user: {
    additionalFields: {
      mustChangePassword: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 6,
    maxPasswordLength: 256,
    revokeSessionsOnPasswordReset: true,
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      const email =
        typeof ctx.body?.email === "string" ? ctx.body.email.trim().toLowerCase() : "";
      if (!email) {
        throw new APIError("BAD_REQUEST", { message: "Email requis" });
      }
      const invitation = await prisma.invitation.findFirst({
        where: {
          email: { equals: email, mode: "insensitive" },
          status: "pending",
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });
      if (!invitation) {
        throw new APIError("BAD_REQUEST", {
          message: "Une invitation valide est nécessaire pour créer un compte.",
        });
      }
    }),
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
      schema: {
        organization: {
          additionalFields: {
            tenantId: {
              type: "string",
              input: true,
              required: true,
            },
          },
        },
      },
      allowUserToCreateOrganization: async (user) => {
        const level = await getGovernanceLevel(user.id, user.role);
        return level === "owner" || level === "admin";
      },
      organizationLimit: async () => false,
      dynamicAccessControl: {
        enabled: true,
      },
      roles: organizationRoles,
      // En prod : brancher un vrai SMTP. En local : invitation créée quand même.
      sendInvitationEmail: async (data) => {
        console.info(
          `[invite] ${data.email} → ${data.organization.name} (${data.invitation.role}) ${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/auth/sign-up?invitationId=${data.invitation.id}`,
        );
      },
      organizationHooks: {
        beforeAddMember: async ({ user, organization }) => {
          await assertUserCanJoinOrganization(user.id, organization.id);
        },
        beforeAcceptInvitation: async ({ user, organization }) => {
          await assertUserCanJoinOrganization(user.id, organization.id);
        },
        afterAddMember: async ({ user, organization }) => {
          await ensureTenantMembership(user.id, organization.id);
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
      const [organizationCtx, passwordState] = await Promise.all([
        getSessionOrganizationContext(user.id, session.activeOrganizationId),
        prisma.user.findUnique({
          where: { id: user.id },
          select: { mustChangePassword: true },
        }),
      ]);
      return {
        user: {
          ...user,
          mustChangePassword: passwordState?.mustChangePassword ?? false,
        },
        session,
        organization: organizationCtx,
      };
    }, authOptions),
  ],
});

export type Session = typeof auth.$Infer.Session;

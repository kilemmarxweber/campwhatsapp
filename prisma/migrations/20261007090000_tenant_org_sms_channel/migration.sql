CREATE TYPE "CampaignChannel" AS ENUM ('whatsapp', 'sms');

CREATE TABLE "tenant_organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenant_organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_member" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenant_member_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "organization" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "message_template" ADD COLUMN "channel" "CampaignChannel" NOT NULL DEFAULT 'whatsapp';
ALTER TABLE "campaign" ADD COLUMN "channel" "CampaignChannel" NOT NULL DEFAULT 'whatsapp';

INSERT INTO "tenant_organization" ("id", "name", "slug")
VALUES ('tenant-tvs-initial', 'TVS Motors', 'tvs-motors');

UPDATE "organization" SET "tenantId" = 'tenant-tvs-initial';

INSERT INTO "tenant_member" ("id", "tenantId", "userId", "role", "createdAt")
SELECT 'tenant-member-' || m."userId", 'tenant-tvs-initial', m."userId", 'member', CURRENT_TIMESTAMP
FROM "member" m
GROUP BY m."userId";

CREATE UNIQUE INDEX "tenant_organization_slug_key" ON "tenant_organization"("slug");
CREATE UNIQUE INDEX "tenant_member_tenantId_userId_key" ON "tenant_member"("tenantId", "userId");
CREATE INDEX "tenant_member_userId_idx" ON "tenant_member"("userId");
CREATE INDEX "organization_tenantId_idx" ON "organization"("tenantId");

ALTER TABLE "tenant_member" ADD CONSTRAINT "tenant_member_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "tenant_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_member" ADD CONSTRAINT "tenant_member_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization" ADD CONSTRAINT "organization_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "tenant_organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

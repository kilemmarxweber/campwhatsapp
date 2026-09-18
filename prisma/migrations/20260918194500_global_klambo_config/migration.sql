-- CreateTable
CREATE TABLE "klambo_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "apiKeyEnc" TEXT NOT NULL,
    "webhookSecret" TEXT,
    "baseUrl" TEXT NOT NULL DEFAULT 'https://whatsapp-api.klambocore.com',
    "defaultCountry" TEXT NOT NULL DEFAULT 'CD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "klambo_config_pkey" PRIMARY KEY ("id")
);

-- Migrate first organization_klambo row if present
INSERT INTO "klambo_config" ("id", "apiKeyEnc", "webhookSecret", "baseUrl", "defaultCountry", "createdAt", "updatedAt")
SELECT 'default', "apiKeyEnc", "webhookSecret", "baseUrl", "defaultCountry", "createdAt", "updatedAt"
FROM "organization_klambo"
ORDER BY "createdAt" ASC
LIMIT 1
ON CONFLICT ("id") DO NOTHING;

-- DropTable
ALTER TABLE "organization_klambo" DROP CONSTRAINT IF EXISTS "organization_klambo_organizationId_fkey";
DROP INDEX IF EXISTS "organization_klambo_organizationId_key";
DROP TABLE IF EXISTS "organization_klambo";

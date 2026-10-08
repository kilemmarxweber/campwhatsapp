ALTER TABLE "klambo_config" ADD COLUMN "tenantId" TEXT;

INSERT INTO "klambo_config" (
    "id",
    "tenantId",
    "apiKeyEnc",
    "webhookSecret",
    "baseUrl",
    "defaultCountry",
    "createdAt",
    "updatedAt"
)
SELECT
    md5(random()::text || t."id"),
    t."id",
    k."apiKeyEnc",
    k."webhookSecret",
    k."baseUrl",
    k."defaultCountry",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "tenant_organization" t
JOIN "klambo_config" k ON k."id" = 'default';

DELETE FROM "klambo_config" WHERE "id" = 'default';

ALTER TABLE "klambo_config" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "klambo_config" ALTER COLUMN "tenantId" SET NOT NULL;

CREATE UNIQUE INDEX "klambo_config_tenantId_key" ON "klambo_config"("tenantId");

ALTER TABLE "klambo_config" ADD CONSTRAINT "klambo_config_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

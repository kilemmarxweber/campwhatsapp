-- Rattache toute succursale encore orpheline à l'organisation parente initiale,
-- puis rend le lien obligatoire.
INSERT INTO "tenant_organization" ("id", "name", "slug")
SELECT 'tenant-tvs-initial', 'TVS Motors', 'tvs-motors'
WHERE NOT EXISTS (
  SELECT 1 FROM "tenant_organization"
  WHERE "id" = 'tenant-tvs-initial' OR "slug" = 'tvs-motors'
);

UPDATE "organization"
SET "tenantId" = COALESCE(
  "tenantId",
  (SELECT "id" FROM "tenant_organization" WHERE "id" = 'tenant-tvs-initial'),
  (SELECT "id" FROM "tenant_organization" ORDER BY "createdAt" ASC LIMIT 1)
)
WHERE "tenantId" IS NULL;

ALTER TABLE "organization" ALTER COLUMN "tenantId" SET NOT NULL;

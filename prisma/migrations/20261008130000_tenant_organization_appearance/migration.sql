ALTER TABLE "tenant_organization" ADD COLUMN IF NOT EXISTS "colorRed" TEXT NOT NULL DEFAULT '#dc4226';
ALTER TABLE "tenant_organization" ADD COLUMN IF NOT EXISTS "colorWhite" TEXT NOT NULL DEFAULT '#ffffff';
ALTER TABLE "tenant_organization" ADD COLUMN IF NOT EXISTS "colorBlue" TEXT NOT NULL DEFAULT '#253c80';
ALTER TABLE "tenant_organization" ADD COLUMN IF NOT EXISTS "locale" TEXT NOT NULL DEFAULT 'fr';

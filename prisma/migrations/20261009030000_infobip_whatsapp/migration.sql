ALTER TABLE "tenant_organization" ADD COLUMN "whatsappProvider" TEXT NOT NULL DEFAULT 'klambo';

ALTER TABLE "message_template" ADD COLUMN "infobipTemplateName" TEXT;
ALTER TABLE "message_template" ADD COLUMN "infobipLanguage" TEXT NOT NULL DEFAULT 'en';

ALTER TABLE "campaign" ADD COLUMN "whatsappTemplateName" TEXT;
ALTER TABLE "campaign" ADD COLUMN "whatsappLanguage" TEXT;

CREATE TABLE "infobip_whatsapp_config" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "apiKeyEnc" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "infobip_whatsapp_config_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "infobip_whatsapp_config_tenantId_key" ON "infobip_whatsapp_config"("tenantId");

ALTER TABLE "infobip_whatsapp_config" ADD CONSTRAINT "infobip_whatsapp_config_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

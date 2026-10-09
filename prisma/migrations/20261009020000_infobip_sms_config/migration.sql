DROP TABLE IF EXISTS "twilio_sms_config";

CREATE TABLE "infobip_sms_config" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "apiKeyEnc" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "infobip_sms_config_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "infobip_sms_config_tenantId_key" ON "infobip_sms_config"("tenantId");

ALTER TABLE "infobip_sms_config" ADD CONSTRAINT "infobip_sms_config_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

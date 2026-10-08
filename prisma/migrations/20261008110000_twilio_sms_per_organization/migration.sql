DROP TABLE IF EXISTS "twilio_sms_config";

CREATE TABLE "twilio_sms_config" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountSid" TEXT NOT NULL,
    "authTokenEnc" TEXT NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "twilio_sms_config_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "twilio_sms_config_tenantId_key" ON "twilio_sms_config"("tenantId");

ALTER TABLE "twilio_sms_config" ADD CONSTRAINT "twilio_sms_config_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

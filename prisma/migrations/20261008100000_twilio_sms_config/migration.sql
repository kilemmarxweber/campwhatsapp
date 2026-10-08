CREATE TABLE "twilio_sms_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "accountSid" TEXT NOT NULL,
    "authTokenEnc" TEXT NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "twilio_sms_config_pkey" PRIMARY KEY ("id")
);

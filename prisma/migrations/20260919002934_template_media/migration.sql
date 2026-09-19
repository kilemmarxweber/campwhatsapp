-- AlterTable
ALTER TABLE "message_template" ADD COLUMN     "mediaId" TEXT,
ADD COLUMN     "messageType" "CampaignMessageType" NOT NULL DEFAULT 'text';

-- AddForeignKey
ALTER TABLE "message_template" ADD CONSTRAINT "message_template_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

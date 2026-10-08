import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
const [row] = await prisma.$queryRaw<
  Array<{
    orgs: number;
    orgs_without_tenant: number;
    tenants: number;
    tenant_members: number;
    campaigns: number;
    whatsapp_campaigns: number;
    sms_campaigns: number;
    invalid_sms_templates: number;
    orphan_contacts: number;
  }>
>`
  SELECT
    (SELECT COUNT(*)::int FROM organization) AS orgs,
    (SELECT COUNT(*)::int FROM organization WHERE "tenantId" IS NULL) AS orgs_without_tenant,
    (SELECT COUNT(*)::int FROM tenant_organization) AS tenants,
    (SELECT COUNT(*)::int FROM tenant_member) AS tenant_members,
    (SELECT COUNT(*)::int FROM campaign) AS campaigns,
    (SELECT COUNT(*)::int FROM campaign WHERE channel = 'whatsapp') AS whatsapp_campaigns,
    (SELECT COUNT(*)::int FROM campaign WHERE channel = 'sms') AS sms_campaigns,
    (SELECT COUNT(*)::int FROM message_template WHERE channel = 'sms' AND ("messageType" <> 'text' OR "mediaId" IS NOT NULL)) AS invalid_sms_templates,
    (SELECT COUNT(*)::int FROM contact c LEFT JOIN organization o ON o.id = c."organizationId" WHERE o.id IS NULL) AS orphan_contacts
`;

console.log(JSON.stringify(row, null, 2));

const failed =
  row.orgs_without_tenant > 0 ||
  row.invalid_sms_templates > 0 ||
  row.orphan_contacts > 0 ||
  (row.orgs > 0 && row.tenants === 0);

await prisma.$disconnect();
if (failed) process.exit(1);
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await prisma.$disconnect();
  process.exit(1);
});

import "dotenv/config";
import { PrismaClient } from "../prisma/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  seedSystemGlobalRoles,
  syncAllGlobalRolesToOrg,
} from "../lib/roles/sync";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  await seedSystemGlobalRoles();
  console.log("✓ Rôles système siège");

  const orgs = await prisma.organization.findMany({
    select: { id: true, slug: true },
  });

  for (const org of orgs) {
    await syncAllGlobalRolesToOrg(org.id);
    console.log(`✓ Rôles → ${org.slug}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

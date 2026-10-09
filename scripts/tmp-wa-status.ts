import "dotenv/config";
import { PrismaClient } from "../prisma/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const row = await prisma.infobipWhatsappConfig.updateMany({
    data: { fromNumber: "447860088970" },
  });
  console.log(JSON.stringify({ updated: row.count, fromNumber: "447860088970" }));
  await prisma.$disconnect();
}

main();

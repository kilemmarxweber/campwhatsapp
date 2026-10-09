import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../prisma/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const mode = process.argv[2] ?? "on";
  const user = await prisma.user.update({
    where: { email: "demo@tvsrdcongo.com" },
    data: { mustChangePassword: mode === "on" },
    select: { id: true, email: true, role: true, mustChangePassword: true },
  });
  if (mode === "restore") {
    const hashed = await hashPassword("demo1234");
    await prisma.account.updateMany({
      where: { userId: user.id, providerId: "credential" },
      data: { password: hashed },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { mustChangePassword: false },
    });
  }
  console.log(JSON.stringify({ ...user, mode }));
  await prisma.$disconnect();
}

main();

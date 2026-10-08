import "dotenv/config";
import prisma from "../lib/prisma";

async function main() {
await prisma.user.deleteMany({ where: { email: "equipe-ui-check@example.invalid" } });
console.log("cleaned");
await prisma.$disconnect();
return;
const rows = await prisma.member.findMany({
  where: { organization: { slug: "tvs" } },
  select: { id: true, role: true, user: { select: { id: true, email: true, name: true } } },
});
console.log(JSON.stringify(rows, null, 2));
await prisma.$disconnect();
return;
const org = await prisma.organization.findUnique({
  where: { slug: "tvs" },
  select: { id: true },
});
if (!org) throw new Error("org");

const email = "equipe-ui-check@example.invalid";
let user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  user = await prisma.user.create({
    data: {
      id: "equipeuicheck00000001",
      name: "Membre Test",
      email,
      emailVerified: true,
      role: "user",
    },
  });
}

const existing = await prisma.member.findFirst({
  where: { organizationId: org.id, userId: user.id },
});
if (!existing) {
  await prisma.member.create({
    data: {
      id: "equipeuimember000001",
      organizationId: org.id,
        userId: user.id,
        role: "user",
        createdAt: new Date(),
    },
  });
}

console.log(JSON.stringify({ orgId: org.id, userId: user.id }));
await prisma.$disconnect();
}

main();

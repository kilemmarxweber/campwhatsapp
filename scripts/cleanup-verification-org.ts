import "dotenv/config";
import prisma from "../lib/prisma";

async function main() {
  const branchSlugs = ["succursale-verification", "agence-test"];

  for (const slug of branchSlugs) {
    const branch = await prisma.organization.findUnique({ where: { slug } });
    if (!branch) continue;
    await prisma.organization.delete({ where: { id: branch.id } });
    console.log(`deleted branch ${slug}`);
  }

  const tenant = await prisma.tenantOrganization.findUnique({
    where: { slug: "organisation-verification" },
  });
  if (tenant) {
    await prisma.tenantOrganization.delete({ where: { id: tenant.id } });
    console.log("deleted tenant organisation-verification");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

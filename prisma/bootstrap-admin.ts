/**
 * MAINTAINR — idempotent PF9 admin bootstrap.
 *
 * Reads PF9_ADMIN_EMAIL / PF9_ADMIN_PASSWORD / PF9_ADMIN_NAME from env and
 * upserts a User + Organization + Membership(role=OWNER). Safe to re-run.
 *
 * Local / dev (TypeScript, needs devDependencies):
 *   PF9_ADMIN_EMAIL=... PF9_ADMIN_PASSWORD=... npm run bootstrap-admin
 *
 * Deployed container — use the PRE-BUILT BUNDLE, not this file. The standalone
 * runner image has no tsx and no devDependencies, and the generated Prisma client
 * is TypeScript-only, so `npm run bootstrap-admin` fails there. The Docker builder
 * stage compiles this into `prisma/bootstrap-admin.mjs`; run that instead:
 *   docker exec -e PF9_ADMIN_EMAIL=... -e PF9_ADMIN_PASSWORD=... \
 *     pf9-apps-maintainr-1 sh -c 'cd /app && npm run bootstrap-admin:prod'
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.PF9_ADMIN_EMAIL;
  const password = process.env.PF9_ADMIN_PASSWORD;
  if (!email || !password) {
    console.error("ERROR: set PF9_ADMIN_EMAIL and PF9_ADMIN_PASSWORD.");
    process.exit(2);
  }
  const name = process.env.PF9_ADMIN_NAME ?? email.split("@")[0];
  const orgName = process.env.PF9_ADMIN_ORG_NAME ?? "PlainSpokenFoundryNine";
  const orgSlug = process.env.PF9_ADMIN_ORG_SLUG ?? "pf9";

  const hashedPassword = await bcrypt.hash(password, 12);

  const org = await prisma.organization.upsert({
    where: { slug: orgSlug },
    update: { name: orgName, plan: "ENTERPRISE" },
    create: { name: orgName, slug: orgSlug, plan: "ENTERPRISE" },
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, hashedPassword },
    create: { name, email, hashedPassword },
  });

  const existing = await prisma.membership.findFirst({
    where: { userId: user.id, organizationId: org.id },
  });
  if (existing) {
    await prisma.membership.update({
      where: { id: existing.id },
      data: { role: "OWNER" },
    });
  } else {
    await prisma.membership.create({
      data: { userId: user.id, organizationId: org.id, role: "OWNER" },
    });
  }

  console.log(`Bootstrapped admin ${email} as OWNER of "${org.name}".`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

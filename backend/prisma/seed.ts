import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = [
    {
      email: "ana@zenco.com",
      password: "zenco2024",
      name: "Ana",
      role: "admin",
      business: "zenco",
    },
    {
      email: "damian@damian.com",
      password: "damian2024",
      name: "Damian",
      role: "admin",
      business: "damian",
    },
    {
      email: "jorge@platform.com",
      password: "123tricaricos",
      name: "Jorge",
      role: "admin",
      business: "all",
    },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash,
        name: u.name,
        role: u.role,
        business: u.business,
      },
    });

    console.log(`Seeded user: ${user.name} (${user.email})`);
  }
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

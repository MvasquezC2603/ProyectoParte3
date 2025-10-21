// prisma/seed.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      password: passwordHash,
      role: "admin",
    },
  });

 // equipos + jugadores
  const leones = await prisma.team.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Leones', city: 'GUA' }
  });

  const aguilas = await prisma.team.upsert({
    where: { id: 2 },
    update: {},
    create: { name: 'Águilas', city: 'MIX' }
  });

  async function ensurePlayer({ name, number, teamId }) {
  const exists = await prisma.player.findFirst({
    where: { name, teamId },
  });
  if (!exists) {
    await prisma.player.create({ data: { name, number, teamId } });
  }
}

await ensurePlayer({ name: 'Juan Pérez', number: 10, teamId: leones.id });
await ensurePlayer({ name: 'Luis Gómez', number: 9, teamId: aguilas.id });

 // partido de ejemplo futuro (dentro de main())
await prisma.match.create({
  data: {
    homeId: leones.id,
    awayId: aguilas.id,
    dateTime: new Date(Date.now() + 3 * 24 * 3600 * 1000) // 3 días hacia adelante
  }
});

  console.log('Seed listo ✅');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
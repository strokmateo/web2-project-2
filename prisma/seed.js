import bcrypt from "bcryptjs";
import prisma from "../src/db.js";

const DEMO_USERS = [
  {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "admin123",
    notes: [
      'Tajna admin bilješka: lozinka za produkcijsku bazu je "P@ssw0rd-prod".',
    ],
  },
  {
    username: "ana",
    password: "ana12345",
    notes: ["Anin PIN za karticu je 4321.", "Kupiti mlijeko."],
  },
  {
    username: "marko",
    password: "marko12345",
    notes: ["Markova privatna bilješka."],
  },
];

async function seedUser({ username, password, notes }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash },
    include: { _count: { select: { notes: true } } },
  });

  if (user._count.notes === 0) {
    await prisma.note.createMany({
      data: notes.map((content) => ({ content, ownerId: user.id })),
    });
  }
}

try {
  for (const user of DEMO_USERS) {
    await seedUser(user);
  }
  console.log(`Seeded users: ${DEMO_USERS.map((u) => u.username).join(", ")}`);
} finally {
  await prisma.$disconnect();
}

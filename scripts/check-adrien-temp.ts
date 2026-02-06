import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function checkAdrien() {
  const adrien = await prisma.admin.findUnique({
    where: { name: 'Adrien' },
    select: {
      id: true,
      name: true,
      mustChangePassword: true,
      passwordChangedAt: true,
    },
  });

  console.log('État de Adrien dans la BDD :');
  console.log(JSON.stringify(adrien, null, 2));

  await prisma.$disconnect();
}

checkAdrien();

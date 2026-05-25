import 'dotenv/config';
import prisma from './src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const hashedPassword = await bcrypt.hash('password', 12);
  const user = await prisma.user.upsert({
    where: { email: 'magang@bulog.co.id' },
    update: {
      password: hashedPassword,
      role: 'magang',
    },
    create: {
      email: 'magang@bulog.co.id',
      password: hashedPassword,
      role: 'magang',
    },
  });
  console.log('Created user:', user);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

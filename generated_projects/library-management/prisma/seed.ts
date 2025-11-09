import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin',
      password: bcrypt.hashSync('adminpass', 10),
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      name: 'John Doe',
      password: bcrypt.hashSync('userpass', 10),
      role: Role.USER,
    },
  });

  const books = [
    { title: '1984', author: 'George Orwell', totalCopies: 3, available: 3 },
    { title: 'To Kill a Mockingbird', author: 'Harper Lee', totalCopies: 2, available: 2 },
    { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', totalCopies: 4, available: 4 },
    { title: 'Pride and Prejudice', author: 'Jane Austen', totalCopies: 5, available: 5 },
    { title: 'Moby-Dick', author: 'Herman Melville', totalCopies: 1, available: 1 },
  ];

  for (const book of books) {
    await prisma.book.upsert({
      where: { title: book.title },
      update: {},
      create: book,
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
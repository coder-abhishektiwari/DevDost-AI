import { PrismaClient } from '@prisma/client';

/**
 * Prisma client singleton.
 *
 * In production we create a single instance.
 * In development (with hot-reload) we store the instance on the global object
 * to avoid exhausting the database connection limit.
 */
let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalAny = global as any;

  if (!globalAny.prisma) {
    globalAny.prisma = new PrismaClient();
  }
  prisma = globalAny.prisma;
}

export default prisma;
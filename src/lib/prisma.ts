import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Prisma 7 requiere un driver adapter para conectarse a la BD.
// El parámetro ?schema=public es solo para Prisma CLI, no para el driver pg,
// por eso lo removemos antes de pasarlo al Pool.
function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL no está definida en .env');
  }
  // Remover parámetros que pg no entiende (como schema=public)
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('schema');
    return parsed.toString();
  } catch {
    // Si no se puede parsear, devolver la URL tal cual
    return url;
  }
}

function createPrismaClient() {
  const connectionString = getConnectionString();
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Evitar múltiples instancias de PrismaClient en desarrollo (hot-reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

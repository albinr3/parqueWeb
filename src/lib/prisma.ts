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
    // Evitar que pg sobrescriba `ssl` desde el connection string.
    parsed.searchParams.delete('sslmode');
    parsed.searchParams.delete('uselibpqcompat');
    return parsed.toString();
  } catch {
    // Si no se puede parsear, devolver la URL tal cual
    return url;
  }
}

function getPoolSslConfig(): pg.PoolConfig['ssl'] | undefined {
  // Control explícito por variable de entorno.
  // Útil en hosts donde la cadena TLS incluye certificados intermedios no confiables.
  const rejectUnauthorizedEnv = process.env.PGSSL_REJECT_UNAUTHORIZED?.toLowerCase();
  if (rejectUnauthorizedEnv === 'false' || rejectUnauthorizedEnv === '0' || rejectUnauthorizedEnv === 'no') {
    return { rejectUnauthorized: false };
  }
  if (rejectUnauthorizedEnv === 'true' || rejectUnauthorizedEnv === '1' || rejectUnauthorizedEnv === 'yes') {
    return { rejectUnauthorized: true };
  }

  // En producción forzamos TLS; en local dejamos defaults para localhost.
  if (process.env.NODE_ENV === 'production') {
    return { rejectUnauthorized: true };
  }

  return undefined;
}

function createPrismaClient() {
  const connectionString = getConnectionString();
  const ssl = getPoolSslConfig();
  const pool = new pg.Pool({
    connectionString,
    ...(ssl ? { ssl } : {}),
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Evitar múltiples instancias de PrismaClient en desarrollo (hot-reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

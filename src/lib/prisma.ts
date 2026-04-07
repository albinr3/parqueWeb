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

function getPoolSslConfig(connectionString: string): pg.PoolConfig['ssl'] | undefined {
  // Control explícito por variable de entorno.
  // Útil en hosts donde la cadena TLS incluye certificados intermedios no confiables.
  if (process.env.PGSSL_REJECT_UNAUTHORIZED === 'false') {
    return { rejectUnauthorized: false };
  }

  // Soporte para sslmode en el URL (ej: sslmode=no-verify).
  try {
    const parsed = new URL(connectionString);
    const sslMode = parsed.searchParams.get('sslmode')?.toLowerCase();
    if (sslMode === 'no-verify') {
      return { rejectUnauthorized: false };
    }
    if (sslMode === 'require' || sslMode === 'verify-ca' || sslMode === 'verify-full') {
      return { rejectUnauthorized: true };
    }
  } catch {
    // Ignorar y dejar que pg use su comportamiento por defecto.
  }

  return undefined;
}

function createPrismaClient() {
  const connectionString = getConnectionString();
  const ssl = getPoolSslConfig(connectionString);
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

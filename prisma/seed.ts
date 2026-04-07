import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando seed...');

  const adminUsername = process.env.ADMIN_USERNAME ?? process.env.ADMIN_EMAIL;
  const adminPasswordPlain = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPasswordPlain) {
    throw new Error(
      'Faltan ADMIN_USERNAME (o ADMIN_EMAIL, compat) o ADMIN_PASSWORD en variables de entorno para crear la cuenta admin.'
    );
  }

  // Crear/actualizar cuenta de admin desde variables de entorno
  const adminPassword = await bcrypt.hash(adminPasswordPlain, 10);
  const admin = await prisma.adminAccount.upsert({
    where: { username: adminUsername },
    update: {
      password: adminPassword,
      name: 'Administrador',
    },
    create: {
      username: adminUsername,
      password: adminPassword,
      name: 'Administrador',
    },
  });
  console.log('✅ Admin creado:', admin.username);

  // Crear configuración por defecto
  const config = await prisma.parkingConfig.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      parkingName: 'Parqueo Moto Badia',
      normalRate: 25,
      lostTicketRate: 100,
      shift1Start: '06:00',
      shift1End: '14:00',
      shift2Start: '14:00',
      shift2End: '22:00',
    },
  });
  console.log('✅ Configuración creada:', config.parkingName);

  // Crear 2 empleados de ejemplo
  const pin1 = await bcrypt.hash('1234', 10);
  const pin2 = await bcrypt.hash('5678', 10);

  const emp1 = await prisma.user.upsert({
    where: { id: 'emp-1' },
    update: {},
    create: {
      id: 'emp-1',
      name: 'Empleado 1',
      pin: pin1,
      role: 'EMPLOYEE',
    },
  });

  const emp2 = await prisma.user.upsert({
    where: { id: 'emp-2' },
    update: {},
    create: {
      id: 'emp-2',
      name: 'Empleado 2',
      pin: pin2,
      role: 'EMPLOYEE',
    },
  });

  console.log('✅ Empleados creados:', emp1.name, emp2.name);

  // Crear algunos tickets de ejemplo para que el dashboard no esté vacío
  const now = new Date();
  const tickets = [];
  for (let i = 1; i <= 10; i++) {
    const entryTime = new Date(now);
    entryTime.setHours(now.getHours() - (10 - i));

    const isPaid = i <= 7;
    const isLost = i === 5;

    tickets.push({
      ticketNumber: i,
      plate: i % 3 === 0 ? `A${String(i).padStart(3, '0')}${String.fromCharCode(65 + i)}` : null,
      status: isLost ? 'LOST_PAID' as const : isPaid ? 'PAID' as const : 'ACTIVE' as const,
      entryTime,
      exitTime: isPaid ? new Date(entryTime.getTime() + 2 * 60 * 60 * 1000) : null,
      amountCharged: isLost ? 100 : isPaid ? 25 : null,
      isLostTicket: isLost,
      userId: i % 2 === 0 ? 'emp-1' : 'emp-2',
      localId: `seed-ticket-${i}`,
      syncedAt: now,
    });
  }

  for (const ticket of tickets) {
    await prisma.ticket.upsert({
      where: { localId: ticket.localId! },
      update: {},
      create: ticket,
    });
  }
  console.log('✅ 10 tickets de ejemplo creados');

  console.log('');
  console.log('🎉 Seed completado!');
  console.log(`👤 Usuario: ${adminUsername}`);
  console.log('🔑 Password: [tomado de ADMIN_PASSWORD]');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

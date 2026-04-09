import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

const defaultParkingConfigUpdate = {
  parkingName: 'Parqueo Moto Badia',
  normalRate: 25,
  lostTicketRate: 100,
  shift1Start: '06:00',
  shift1End: '14:00',
  shift2Start: '14:00',
  shift2End: '22:00',
  ticketHeader: null,
};

// POST /api/reset — Blanquear la data operativa para iniciar desde cero
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const deletedTickets = await tx.ticket.deleteMany({});
      const deletedClosures = await tx.shiftClosure.deleteMany({});
      const deletedUsers = await tx.user.deleteMany({});

      await tx.parkingConfig.upsert({
        where: { id: 'main' },
        update: defaultParkingConfigUpdate,
        create: {
          id: 'main',
          ...defaultParkingConfigUpdate,
        },
      });

      return {
        tickets: deletedTickets.count,
        closures: deletedClosures.count,
        users: deletedUsers.count,
      };
    });

    return NextResponse.json({
      ok: true,
      message: 'Base de datos blanqueada correctamente',
      deleted: result,
    });
  } catch (error) {
    console.error('Error blanqueando base de datos:', error);
    return NextResponse.json(
      { error: 'Error blanqueando base de datos' },
      { status: 500 }
    );
  }
}

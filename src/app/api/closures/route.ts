import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/closures — Listar cierres de turno
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const userId = searchParams.get('userId');

    const where: Record<string, unknown> = {};

    if (userId) where.userId = userId;

    if (dateFrom || dateTo) {
      where.endTime = {};
      if (dateFrom) (where.endTime as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        (where.endTime as Record<string, unknown>).lte = end;
      }
    }

    const closures = await prisma.shiftClosure.findMany({
      where,
      include: {
        user: { select: { name: true } },
        _count: { select: { tickets: true } },
      },
      orderBy: { endTime: 'desc' },
    });

    return NextResponse.json(closures);
  } catch (error) {
    console.error('Error al listar cierres:', error);
    return NextResponse.json(
      { error: 'Error al listar cierres' },
      { status: 500 }
    );
  }
}

// POST /api/closures — Crear cierre de turno (desde sync app)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const closure = await prisma.shiftClosure.create({
      data: {
        userId: body.userId,
        shiftLabel: body.shiftLabel,
        startTime: new Date(body.startTime),
        endTime: body.endTime ? new Date(body.endTime) : new Date(),
        totalTickets: body.totalTickets,
        normalTickets: body.normalTickets,
        lostTickets: body.lostTickets,
        totalAmount: body.totalAmount,
        normalAmount: body.normalAmount,
        lostAmount: body.lostAmount,
        notes: body.notes || null,
        localId: body.localId || null,
        syncedAt: new Date(),
      },
    });

    return NextResponse.json(closure, { status: 201 });
  } catch (error) {
    console.error('Error al crear cierre:', error);
    return NextResponse.json(
      { error: 'Error al crear cierre' },
      { status: 500 }
    );
  }
}

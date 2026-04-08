import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseDateParamInTimeZone } from '@/lib/timezone';

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
      if (dateFrom) {
        const parsedFrom = parseDateParamInTimeZone(dateFrom);
        if (!parsedFrom) {
          return NextResponse.json(
            { error: 'dateFrom inválida. Use formato ISO o YYYY-MM-DD' },
            { status: 400 }
          );
        }
        (where.endTime as Record<string, unknown>).gte = parsedFrom;
      }
      if (dateTo) {
        const parsedTo = parseDateParamInTimeZone(dateTo, { endOfDayForDateOnly: true });
        if (!parsedTo) {
          return NextResponse.json(
            { error: 'dateTo inválida. Use formato ISO o YYYY-MM-DD' },
            { status: 400 }
          );
        }
        (where.endTime as Record<string, unknown>).lte = parsedTo;
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
    const startTime =
      typeof body.startTime === 'string' ? parseDateParamInTimeZone(body.startTime) : null;
    const endTime =
      typeof body.endTime === 'string' ? parseDateParamInTimeZone(body.endTime) : new Date();

    if (!startTime) {
      return NextResponse.json(
        { error: 'startTime inválida. Use formato ISO o YYYY-MM-DD' },
        { status: 400 }
      );
    }

    if (typeof body.endTime === 'string' && !endTime) {
      return NextResponse.json(
        { error: 'endTime inválida. Use formato ISO o YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const closure = await prisma.shiftClosure.create({
      data: {
        userId: body.userId,
        shiftLabel: body.shiftLabel,
        startTime,
        endTime: endTime ?? new Date(),
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

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_TIMEZONE, getDayBoundsUtc, parseDateParamInTimeZone } from '@/lib/timezone';

const getDateKeyInTimeZone = (date: Date, timeZone: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

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
      },
      orderBy: { endTime: 'desc' },
    });

    const closuresWithPending = await Promise.all(
      closures.map(async (closure) => {
        const pendingByShiftWindow = await prisma.ticket.count({
          where: {
            userId: closure.userId,
            entryTime: {
              gte: closure.startTime,
              lte: closure.endTime,
            },
            OR: [
              { exitTime: null },
              { exitTime: { gt: closure.endTime } },
            ],
          },
        });

        let pendingExitTickets = pendingByShiftWindow;

        const shiftWindowMs = closure.endTime.getTime() - closure.startTime.getTime();
        const hasDegenerateWindow = !Number.isFinite(shiftWindowMs) || shiftWindowMs <= 60 * 1000;
        const shouldFallbackToDayWindow =
          pendingByShiftWindow === 0 && hasDegenerateWindow && closure.totalTickets > 0;

        if (shouldFallbackToDayWindow) {
          const closureDate = getDateKeyInTimeZone(closure.endTime, DEFAULT_TIMEZONE);
          const { startOfDay } = getDayBoundsUtc(closureDate, DEFAULT_TIMEZONE);

          pendingExitTickets = await prisma.ticket.count({
            where: {
              userId: closure.userId,
              entryTime: {
                gte: startOfDay,
                lte: closure.endTime,
              },
              OR: [
                { exitTime: null },
                { exitTime: { gt: closure.endTime } },
              ],
            },
          });
        }

        return {
          ...closure,
          pendingExitTickets,
        };
      })
    );

    return NextResponse.json(closuresWithPending);
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

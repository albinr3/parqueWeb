import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseDateParamInTimeZone } from '@/lib/timezone';

const asNullableInt = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? Math.trunc(num) : null;
};

// GET /api/tickets — Listar tickets con filtros y paginación
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const ticketNumber = searchParams.get('ticketNumber');
    const plate = searchParams.get('plate');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Construir filtros dinámicamente
    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (ticketNumber) where.ticketNumber = parseInt(ticketNumber);
    if (plate) where.plate = { contains: plate, mode: 'insensitive' };

    if (dateFrom || dateTo) {
      where.entryTime = {};
      if (dateFrom) {
        const parsedFrom = parseDateParamInTimeZone(dateFrom);
        if (!parsedFrom) {
          return NextResponse.json(
            { error: 'dateFrom inválida. Use formato ISO o YYYY-MM-DD' },
            { status: 400 }
          );
        }
        (where.entryTime as Record<string, unknown>).gte = parsedFrom;
      }
      if (dateTo) {
        const parsedTo = parseDateParamInTimeZone(dateTo, { endOfDayForDateOnly: true });
        if (!parsedTo) {
          return NextResponse.json(
            { error: 'dateTo inválida. Use formato ISO o YYYY-MM-DD' },
            { status: 400 }
          );
        }
        (where.entryTime as Record<string, unknown>).lte = parsedTo;
      }
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ticket.count({ where }),
    ]);

    return NextResponse.json({
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error al listar tickets:', error);
    return NextResponse.json(
      { error: 'Error al listar tickets' },
      { status: 500 }
    );
  }
}

// POST /api/tickets — Crear ticket (usado por sync desde app móvil)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const entryTime =
      typeof body.entryTime === 'string' ? parseDateParamInTimeZone(body.entryTime) : new Date();
    const exitTime =
      typeof body.exitTime === 'string' ? parseDateParamInTimeZone(body.exitTime) : null;

    if (typeof body.entryTime === 'string' && !entryTime) {
      return NextResponse.json(
        { error: 'entryTime inválida. Use formato ISO o YYYY-MM-DD' },
        { status: 400 }
      );
    }

    if (typeof body.exitTime === 'string' && !exitTime) {
      return NextResponse.json(
        { error: 'exitTime inválida. Use formato ISO o YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const status = (body.status || 'ACTIVE') as 'ACTIVE' | 'PAID' | 'LOST_PAID' | 'CANCELLED';
    const isLostTicket = body.isLostTicket === true || body.isLostTicket === 1 || body.isLostTicket === '1';
    const amountChargedRaw = asNullableInt(body.amountCharged);
    const entryAmountRaw = asNullableInt(body.entryAmountCharged);
    const lostExtraRaw = asNullableInt(body.lostExtraCharged);
    const shouldInferLost = status === 'LOST_PAID' || isLostTicket;
    let entryAmount = Math.max(entryAmountRaw ?? 0, 0);
    let lostExtra = Math.max(lostExtraRaw ?? 0, 0);

    if (entryAmountRaw === null && amountChargedRaw !== null && !shouldInferLost) {
      entryAmount = Math.max(amountChargedRaw, 0);
    }

    if (lostExtraRaw === null && amountChargedRaw !== null && shouldInferLost) {
      const inferredLost = Math.max(amountChargedRaw - entryAmount, 0);
      lostExtra = inferredLost > 0 ? inferredLost : Math.max(amountChargedRaw, 0);
    }

    const amountCharged =
      entryAmountRaw !== null || lostExtraRaw !== null
        ? entryAmount + lostExtra
        : amountChargedRaw ?? entryAmount + lostExtra;

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: body.ticketNumber,
        plate: body.plate || null,
        status,
        entryTime: entryTime ?? new Date(),
        exitTime,
        amountCharged,
        entryAmountCharged: entryAmount,
        lostExtraCharged: lostExtra,
        isLostTicket,
        userId: body.userId,
        closureId: body.closureId || null,
        localId: body.localId || null,
        syncedAt: new Date(),
      },
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error('Error al crear ticket:', error);
    return NextResponse.json(
      { error: 'Error al crear ticket' },
      { status: 500 }
    );
  }
}

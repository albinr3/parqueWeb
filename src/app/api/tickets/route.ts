import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
      if (dateFrom) (where.entryTime as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        (where.entryTime as Record<string, unknown>).lte = end;
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

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: body.ticketNumber,
        plate: body.plate || null,
        status: body.status || 'ACTIVE',
        entryTime: body.entryTime ? new Date(body.entryTime) : new Date(),
        exitTime: body.exitTime ? new Date(body.exitTime) : null,
        amountCharged: body.amountCharged ?? null,
        isLostTicket: body.isLostTicket === true || body.isLostTicket === 1 || body.isLostTicket === '1',
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

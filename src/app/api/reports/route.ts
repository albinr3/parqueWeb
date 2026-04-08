import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_TIMEZONE, getDayBoundsUtc } from '@/lib/timezone';

// GET /api/reports — Obtener reportes del dashboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    const { startOfDay, endOfDay, date } = getDayBoundsUtc(dateStr, DEFAULT_TIMEZONE);

    // Consultas paralelas para el resumen del día
    const [
      totalMotosHoy,
      motosActivas,
      cobrosEntradaHoy,
      recargosPerdidoHoy,
      cierresHoy,
      ultimosTickets,
    ] = await Promise.all([
      // Total de motos hoy (todas las que entraron)
      prisma.ticket.count({
        where: {
          entryTime: { gte: startOfDay, lte: endOfDay },
        },
      }),
      // Motos activas (aún en el parqueo)
      prisma.ticket.count({
        where: { status: 'ACTIVE' },
      }),
      // Cobro normal: se registra al crear ticket
      prisma.ticket.aggregate({
        where: {
          entryTime: { gte: startOfDay, lte: endOfDay },
        },
        _count: true,
        _sum: { entryAmountCharged: true },
      }),
      // Recargo por ticket perdido: se registra al salir
      prisma.ticket.aggregate({
        where: {
          exitTime: { gte: startOfDay, lte: endOfDay },
          lostExtraCharged: { gt: 0 },
        },
        _count: true,
        _sum: { lostExtraCharged: true },
      }),
      // Cierres de hoy
      prisma.shiftClosure.findMany({
        where: {
          endTime: { gte: startOfDay, lte: endOfDay },
        },
        include: {
          user: { select: { name: true } },
        },
        orderBy: { endTime: 'desc' },
      }),
      // Últimos 10 tickets
      prisma.ticket.findMany({
        where: {
          entryTime: { gte: startOfDay, lte: endOfDay },
        },
        include: {
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const totalRecaudado =
      (cobrosEntradaHoy._sum.entryAmountCharged || 0) +
      (recargosPerdidoHoy._sum.lostExtraCharged || 0);

    return NextResponse.json({
      date,
      kpis: {
        totalMotos: totalMotosHoy,
        motosActivas,
        totalRecaudado,
        ticketsNormales: cobrosEntradaHoy._count,
        montoNormales: cobrosEntradaHoy._sum.entryAmountCharged || 0,
        ticketsPerdidos: recargosPerdidoHoy._count,
        montoPerdidos: recargosPerdidoHoy._sum.lostExtraCharged || 0,
      },
      cierres: cierresHoy,
      ultimosTickets,
    });
  } catch (error) {
    console.error('Error al generar reportes:', error);
    return NextResponse.json(
      { error: 'Error al generar reportes' },
      { status: 500 }
    );
  }
}

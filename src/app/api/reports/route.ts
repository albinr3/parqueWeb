import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/reports — Obtener reportes del dashboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');

    // Fecha del reporte (hoy por defecto)
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Consultas paralelas para el resumen del día
    const [
      totalMotosHoy,
      motosActivas,
      ticketsPagados,
      ticketsPerdidos,
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
      // Tickets pagados hoy (normales)
      prisma.ticket.aggregate({
        where: {
          exitTime: { gte: startOfDay, lte: endOfDay },
          status: 'PAID',
        },
        _count: true,
        _sum: { amountCharged: true },
      }),
      // Tickets perdidos pagados hoy
      prisma.ticket.aggregate({
        where: {
          exitTime: { gte: startOfDay, lte: endOfDay },
          status: 'LOST_PAID',
        },
        _count: true,
        _sum: { amountCharged: true },
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
      (ticketsPagados._sum.amountCharged || 0) +
      (ticketsPerdidos._sum.amountCharged || 0);

    return NextResponse.json({
      date: targetDate.toISOString().split('T')[0],
      kpis: {
        totalMotos: totalMotosHoy,
        motosActivas,
        totalRecaudado,
        ticketsNormales: ticketsPagados._count,
        montoNormales: ticketsPagados._sum.amountCharged || 0,
        ticketsPerdidos: ticketsPerdidos._count,
        montoPerdidos: ticketsPerdidos._sum.amountCharged || 0,
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

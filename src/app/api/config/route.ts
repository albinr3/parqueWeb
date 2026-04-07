import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/config — Obtener configuración del parqueo
export async function GET() {
  try {
    // Crear configuración por defecto si no existe (idempotente)
    let config = await prisma.parkingConfig.findUnique({
      where: { id: 'main' },
    });

    if (!config) {
      config = await prisma.parkingConfig.create({
        data: { id: 'main' },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}

// PUT /api/config — Actualizar configuración
export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const config = await prisma.parkingConfig.upsert({
      where: { id: 'main' },
      update: {
        parkingName: body.parkingName,
        normalRate: body.normalRate ? parseInt(body.normalRate) : undefined,
        lostTicketRate: body.lostTicketRate ? parseInt(body.lostTicketRate) : undefined,
        shift1Start: body.shift1Start,
        shift1End: body.shift1End,
        shift2Start: body.shift2Start,
        shift2End: body.shift2End,
        ticketHeader: body.ticketHeader,
      },
      create: {
        id: 'main',
        parkingName: body.parkingName || 'Parqueo Moto Badia',
        normalRate: body.normalRate ? parseInt(body.normalRate) : 25,
        lostTicketRate: body.lostTicketRate ? parseInt(body.lostTicketRate) : 100,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    return NextResponse.json(
      { error: 'Error al actualizar configuración' },
      { status: 500 }
    );
  }
}

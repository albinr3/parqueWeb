import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/sync — Sincronización bulk desde la app móvil
// Recibe un lote de tickets y cierres para sincronizar
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const results = { tickets: 0, closures: 0, errors: [] as string[] };

    // Sincronizar tickets
    if (body.tickets && Array.isArray(body.tickets)) {
      for (const ticket of body.tickets) {
        try {
          // Verificar si ya existe por localId (idempotencia)
          if (ticket.localId) {
            const exists = await prisma.ticket.findUnique({
              where: { localId: ticket.localId },
            });
            if (exists) {
              // Actualizar si cambió el estado
              await prisma.ticket.update({
                where: { localId: ticket.localId },
                data: {
                  status: ticket.status,
                  exitTime: ticket.exitTime ? new Date(ticket.exitTime) : undefined,
                  amountCharged: ticket.amountCharged,
                  isLostTicket: ticket.isLostTicket,
                  closureId: ticket.closureId,
                  syncedAt: new Date(),
                },
              });
              results.tickets++;
              continue;
            }
          }

          // Crear nuevo ticket
          await prisma.ticket.create({
            data: {
              ticketNumber: ticket.ticketNumber,
              plate: ticket.plate || null,
              status: ticket.status || 'ACTIVE',
              entryTime: new Date(ticket.entryTime),
              exitTime: ticket.exitTime ? new Date(ticket.exitTime) : null,
              amountCharged: ticket.amountCharged || null,
              isLostTicket: ticket.isLostTicket || false,
              userId: ticket.userId,
              closureId: ticket.closureId || null,
              localId: ticket.localId,
              syncedAt: new Date(),
            },
          });
          results.tickets++;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
          results.errors.push(`Ticket ${ticket.ticketNumber}: ${errorMsg}`);
        }
      }
    }

    // Sincronizar cierres de turno
    if (body.closures && Array.isArray(body.closures)) {
      for (const closure of body.closures) {
        try {
          // Verificar idempotencia por localId
          if (closure.localId) {
            const exists = await prisma.shiftClosure.findUnique({
              where: { localId: closure.localId },
            });
            if (exists) {
              results.closures++;
              continue;
            }
          }

          await prisma.shiftClosure.create({
            data: {
              userId: closure.userId,
              shiftLabel: closure.shiftLabel,
              startTime: new Date(closure.startTime),
              endTime: new Date(closure.endTime),
              totalTickets: closure.totalTickets,
              normalTickets: closure.normalTickets,
              lostTickets: closure.lostTickets,
              totalAmount: closure.totalAmount,
              normalAmount: closure.normalAmount,
              lostAmount: closure.lostAmount,
              notes: closure.notes || null,
              localId: closure.localId,
              syncedAt: new Date(),
            },
          });
          results.closures++;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
          results.errors.push(`Cierre ${closure.localId}: ${errorMsg}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      synced: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error en sincronización:', error);
    return NextResponse.json(
      { error: 'Error en sincronización' },
      { status: 500 }
    );
  }
}

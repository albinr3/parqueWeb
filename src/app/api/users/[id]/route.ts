import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const VALID_SHIFTS = ['SHIFT_1', 'SHIFT_2'] as const;

// PATCH /api/users/[id] — Actualizar empleado
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.shift !== undefined) {
      if (!VALID_SHIFTS.includes(body.shift)) {
        return NextResponse.json(
          { error: 'Turno inválido' },
          { status: 400 }
        );
      }
      updateData.shift = body.shift;
    }

    // Si se envía un nuevo PIN, hashearlo
    if (body.pin) {
      if (body.pin.length !== 4 || !/^\d{4}$/.test(body.pin)) {
        return NextResponse.json(
          { error: 'El PIN debe ser de 4 dígitos' },
          { status: 400 }
        );
      }
      updateData.pin = await bcrypt.hash(body.pin, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        role: true,
        shift: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error al actualizar empleado:', error);
    return NextResponse.json(
      { error: 'Error al actualizar empleado' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] — Eliminar empleado
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar si tiene tickets asociados antes de eliminar
    const ticketCount = await prisma.ticket.count({
      where: { userId: id },
    });

    if (ticketCount > 0) {
      // En lugar de eliminar, desactivar para mantener integridad de datos
      const user = await prisma.user.update({
        where: { id },
        data: { active: false },
      });
      return NextResponse.json({
        ...user,
        message: 'Empleado desactivado (tiene tickets asociados)',
      });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: 'Empleado eliminado' });
  } catch (error) {
    console.error('Error al eliminar empleado:', error);
    return NextResponse.json(
      { error: 'Error al eliminar empleado' },
      { status: 500 }
    );
  }
}

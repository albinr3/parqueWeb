import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const VALID_SHIFTS = ['SHIFT_1', 'SHIFT_2'] as const;

// GET /api/users — Listar empleados
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includePinHash = searchParams.get('includePinHash') === '1';

    const users = await prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        role: true,
        shift: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        ...(includePinHash ? { pin: true } : {}),
      },
    });

    if (includePinHash) {
      return NextResponse.json(
        users.map((user) => {
          const { pin, ...safeUser } = user;
          return {
            ...safeUser,
            pinHash: pin,
          };
        })
      );
    }

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error al listar empleados:', error);
    return NextResponse.json(
      { error: 'Error al listar empleados' },
      { status: 500 }
    );
  }
}

// POST /api/users — Crear empleado
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name || !body.pin || !body.shift) {
      return NextResponse.json(
        { error: 'Nombre, PIN y turno son requeridos' },
        { status: 400 }
      );
    }

    if (body.pin.length !== 4 || !/^\d{4}$/.test(body.pin)) {
      return NextResponse.json(
        { error: 'El PIN debe ser de 4 dígitos' },
        { status: 400 }
      );
    }

    if (!VALID_SHIFTS.includes(body.shift)) {
      return NextResponse.json(
        { error: 'Turno inválido' },
        { status: 400 }
      );
    }

    // Hashear el PIN para seguridad
    const hashedPin = await bcrypt.hash(body.pin, 10);

    const user = await prisma.user.create({
      data: {
        name: body.name,
        pin: hashedPin,
        role: 'EMPLOYEE',
        shift: body.shift,
      },
      select: {
        id: true,
        name: true,
        role: true,
        shift: true,
        active: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error al crear empleado:', error);
    return NextResponse.json(
      { error: 'Error al crear empleado' },
      { status: 500 }
    );
  }
}

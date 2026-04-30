import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseDateParamInTimeZone } from '@/lib/timezone';
import { Prisma } from '@prisma/client';

type SyncEntityType = 'ticket' | 'closure';
type SyncAction = 'create' | 'update';

type SyncEvent = {
  id: string;
  entityType: SyncEntityType;
  entityId?: string;
  action: SyncAction;
  payload: Record<string, unknown>;
};

type SyncResults = {
  tickets: number;
  closures: number;
  errors: string[];
  processedEventIds: string[];
  failedEventIds: string[];
  failedEvents: Array<{
    eventId: string;
    entityType: SyncEntityType;
    code: string;
    message: string;
  }>;
};

const SYSTEM_SYNC_USER_ID = 'sync-system-user';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const asNullableInt = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? Math.trunc(num) : null;
};

const asRequiredInt = (value: unknown, field: string): number => {
  const num = asNullableInt(value);
  if (num === null) {
    throw new Error(`Campo requerido inválido: ${field}`);
  }
  return num;
};

const asBoolean = (value: unknown): boolean =>
  value === true || value === 1 || value === '1';

const asDate = (value: unknown, field: string): Date => {
  const raw = asString(value);
  if (!raw) throw new Error(`Campo requerido inválido: ${field}`);
  const parsed = parseDateParamInTimeZone(raw) ?? new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Fecha inválida en ${field}`);
  }
  return parsed;
};

const normalizeTicketAmounts = ({
  amountCharged,
  entryAmountCharged,
  lostExtraCharged,
  status,
  isLostTicket,
}: {
  amountCharged: number | null;
  entryAmountCharged: number | null;
  lostExtraCharged: number | null;
  status: 'ACTIVE' | 'PAID' | 'LOST_PAID' | 'CANCELLED';
  isLostTicket: boolean;
}) => {
  const shouldInferLost = status === 'LOST_PAID' || isLostTicket;
  let entryAmount = Math.max(entryAmountCharged ?? 0, 0);
  let lostExtra = Math.max(lostExtraCharged ?? 0, 0);

  if (entryAmountCharged === null && amountCharged !== null && !shouldInferLost) {
    entryAmount = Math.max(amountCharged, 0);
  }

  if (lostExtraCharged === null && amountCharged !== null && shouldInferLost) {
    const inferredLost = Math.max(amountCharged - entryAmount, 0);
    lostExtra = inferredLost > 0 ? inferredLost : Math.max(amountCharged, 0);
  }

  const totalAmount =
    entryAmountCharged !== null || lostExtraCharged !== null
      ? entryAmount + lostExtra
      : amountCharged ?? entryAmount + lostExtra;

  return {
    amountCharged: totalAmount,
    entryAmountCharged: entryAmount,
    lostExtraCharged: lostExtra,
  };
};

const resolveUserId = async (rawUserId: unknown): Promise<string> => {
  const requestedUserId = asString(rawUserId);

  if (requestedUserId) {
    const existing = await prisma.user.findUnique({
      where: { id: requestedUserId },
      select: { id: true },
    });

    if (existing) return existing.id;

    try {
      const created = await prisma.user.create({
        data: {
          id: requestedUserId,
          name: `Operador móvil (${requestedUserId})`,
          pin: 'sync-placeholder',
          role: 'EMPLOYEE',
          active: true,
        },
        select: { id: true },
      });
      return created.id;
    } catch {
      const retry = await prisma.user.findUnique({
        where: { id: requestedUserId },
        select: { id: true },
      });
      if (retry) return retry.id;
    }
  }

  const firstActive = await prisma.user.findFirst({
    where: { active: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  if (firstActive) return firstActive.id;

  const fallback = await prisma.user.upsert({
    where: { id: SYSTEM_SYNC_USER_ID },
    update: {},
    create: {
      id: SYSTEM_SYNC_USER_ID,
      name: 'Operador Sync',
      pin: 'sync-placeholder',
      role: 'EMPLOYEE',
      active: true,
    },
    select: { id: true },
  });

  return fallback.id;
};

const extractSyncEvents = (body: unknown): SyncEvent[] => {
  if (!isRecord(body)) return [];

  if (Array.isArray(body.events)) {
    return body.events
      .filter(isRecord)
      .map((event, index) => {
        const eventId = asString(event.id) ?? `event-${index}`;
        const entityType = asString(event.entityType) as SyncEntityType | null;
        const action = asString(event.action) as SyncAction | null;
        const payload = isRecord(event.payload) ? event.payload : {};

        if (!entityType || (entityType !== 'ticket' && entityType !== 'closure')) {
          throw new Error(`Evento ${eventId} con entityType inválido`);
        }

        return {
          id: eventId,
          entityType,
          entityId: asString(event.entityId) ?? undefined,
          action: action === 'update' ? 'update' : 'create',
          payload,
        };
      });
  }

  const legacyEvents: SyncEvent[] = [];

  if (Array.isArray(body.tickets)) {
    legacyEvents.push(
      ...body.tickets.filter(isRecord).map<SyncEvent>((ticket, index) => ({
        id: asString(ticket.id) ?? asString(ticket.localId) ?? `ticket-${index}`,
        entityType: 'ticket' as const,
        entityId: asString(ticket.id) ?? asString(ticket.localId) ?? undefined,
        action: (asString(ticket.action) as SyncAction) === 'update' ? 'update' : 'create',
        payload: ticket,
      }))
    );
  }

  if (Array.isArray(body.closures)) {
    legacyEvents.push(
      ...body.closures.filter(isRecord).map<SyncEvent>((closure, index) => ({
        id: asString(closure.id) ?? asString(closure.localId) ?? `closure-${index}`,
        entityType: 'closure' as const,
        entityId: asString(closure.id) ?? asString(closure.localId) ?? undefined,
        action: 'create' as const,
        payload: closure,
      }))
    );
  }

  return legacyEvents;
};

const classifySyncError = (
  error: unknown
): {
  code: string;
  message: string;
} => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    const target = Array.isArray(error.meta?.target)
      ? error.meta.target.map(String).join(',')
      : String(error.meta?.target ?? '');

    if (target.includes('ticketNumber')) {
      return {
        code: 'DUPLICATE_TICKET_NUMBER',
        message: 'El ticketNumber ya existe en servidor',
      };
    }

    if (target.includes('localId')) {
      return {
        code: 'DUPLICATE_LOCAL_ID',
        message: 'El localId ya existe en servidor',
      };
    }
  }

  if (error instanceof Error) {
    return { code: 'SYNC_EVENT_ERROR', message: error.message };
  }

  return { code: 'SYNC_EVENT_ERROR', message: 'Error desconocido' };
};

const processTicketEvent = async (event: SyncEvent) => {
  const ticket = event.payload;
  const ticketNumber = asRequiredInt(ticket.ticketNumber, 'ticket.ticketNumber');
  const entryTime = asDate(ticket.entryTime, 'ticket.entryTime');
  const localId = asString(ticket.localId) ?? asString(ticket.id) ?? event.entityId ?? null;
  const userId = await resolveUserId(ticket.userId);
  const status = (asString(ticket.status) ?? 'ACTIVE') as 'ACTIVE' | 'PAID' | 'LOST_PAID' | 'CANCELLED';
  const isLostTicket = asBoolean(ticket.isLostTicket);
  const amounts = normalizeTicketAmounts({
    amountCharged: asNullableInt(ticket.amountCharged),
    entryAmountCharged: asNullableInt(ticket.entryAmountCharged),
    lostExtraCharged: asNullableInt(ticket.lostExtraCharged),
    status,
    isLostTicket,
  });

  const createData = {
    ticketNumber,
    plate: asString(ticket.plate) ?? null,
    status,
    entryTime,
    exitTime: asString(ticket.exitTime) ? asDate(ticket.exitTime, 'ticket.exitTime') : null,
    amountCharged: amounts.amountCharged,
    entryAmountCharged: amounts.entryAmountCharged,
    lostExtraCharged: amounts.lostExtraCharged,
    isLostTicket,
    userId,
    closureId: asString(ticket.closureId) ?? null,
    localId,
    syncedAt: new Date(),
  };

  const updateData = {
    plate: createData.plate,
    status: createData.status,
    entryTime: createData.entryTime,
    exitTime: createData.exitTime,
    amountCharged: createData.amountCharged,
    entryAmountCharged: createData.entryAmountCharged,
    lostExtraCharged: createData.lostExtraCharged,
    isLostTicket: createData.isLostTicket,
    userId: createData.userId,
    closureId: createData.closureId,
    syncedAt: new Date(),
  };

  if (localId) {
    await prisma.ticket.upsert({
      where: { localId },
      create: createData,
      update: updateData,
    });
    return;
  }

  const existing = await prisma.ticket.findFirst({
    where: {
      ticketNumber,
      userId,
      entryTime,
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.ticket.update({
      where: { id: existing.id },
      data: updateData,
    });
    return;
  }

  await prisma.ticket.create({ data: createData });
};

const processClosureEvent = async (event: SyncEvent) => {
  const closure = event.payload;
  const localId = asString(closure.localId) ?? asString(closure.id) ?? event.entityId ?? null;
  const userId = await resolveUserId(closure.userId);

  const createData = {
    userId,
    shiftLabel: asString(closure.shiftLabel) ?? 'Turno Diario',
    startTime: asDate(closure.startTime, 'closure.startTime'),
    endTime: asString(closure.endTime) ? asDate(closure.endTime, 'closure.endTime') : new Date(),
    totalTickets: asRequiredInt(closure.totalTickets, 'closure.totalTickets'),
    normalTickets: asRequiredInt(closure.normalTickets, 'closure.normalTickets'),
    lostTickets: asRequiredInt(closure.lostTickets, 'closure.lostTickets'),
    totalAmount: asRequiredInt(closure.totalAmount, 'closure.totalAmount'),
    normalAmount: asRequiredInt(closure.normalAmount, 'closure.normalAmount'),
    lostAmount: asRequiredInt(closure.lostAmount, 'closure.lostAmount'),
    notes: asString(closure.notes) ?? null,
    localId,
    syncedAt: new Date(),
  };

  const updateData = {
    userId: createData.userId,
    shiftLabel: createData.shiftLabel,
    startTime: createData.startTime,
    endTime: createData.endTime,
    totalTickets: createData.totalTickets,
    normalTickets: createData.normalTickets,
    lostTickets: createData.lostTickets,
    totalAmount: createData.totalAmount,
    normalAmount: createData.normalAmount,
    lostAmount: createData.lostAmount,
    notes: createData.notes,
    syncedAt: new Date(),
  };

  if (localId) {
    await prisma.shiftClosure.upsert({
      where: { localId },
      create: createData,
      update: updateData,
    });
    return;
  }

  await prisma.shiftClosure.create({ data: createData });
};

// POST /api/sync — Sincronización bulk desde la app móvil
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const events = extractSyncEvents(body);
    const results: SyncResults = {
      tickets: 0,
      closures: 0,
      errors: [],
      processedEventIds: [],
      failedEventIds: [],
      failedEvents: [],
    };

    for (const event of events) {
      try {
        if (event.entityType === 'ticket') {
          await processTicketEvent(event);
          results.tickets += 1;
        } else if (event.entityType === 'closure') {
          await processClosureEvent(event);
          results.closures += 1;
        }

        results.processedEventIds.push(event.id);
      } catch (err) {
        const { code, message } = classifySyncError(err);
        results.errors.push(`[${code}] Evento ${event.id} (${event.entityType}): ${message}`);
        results.failedEventIds.push(event.id);
        results.failedEvents.push({
          eventId: event.id,
          entityType: event.entityType,
          code,
          message,
        });
      }
    }

    return NextResponse.json({
      success: results.failedEventIds.length === 0,
      synced: {
        tickets: results.tickets,
        closures: results.closures,
        errors: results.errors,
      },
      processedEventIds: results.processedEventIds,
      failedEventIds: results.failedEventIds,
      failedEvents: results.failedEvents,
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

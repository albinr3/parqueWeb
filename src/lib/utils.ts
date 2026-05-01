import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Formatear fecha en español
export function formatDate(date: Date | string): string {
  return format(new Date(date), 'dd/MM/yyyy', { locale: es });
}

// Formatear fecha y hora
export function formatDateTime(date: Date | string): string {
  return format(new Date(date), 'dd/MM/yyyy hh:mm a', { locale: es });
}

// Formatear hora
export function formatTime(date: Date | string): string {
  return format(new Date(date), 'hh:mm a', { locale: es });
}

// Formatear moneda en pesos dominicanos
export function formatCurrency(amount: number): string {
  return `RD$ ${amount.toLocaleString('es-DO')}`;
}

// Traducir estado del ticket
export function translateStatus(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'En parqueo',
    PAID: 'Completado',
    LOST_PAID: 'Perdido',
    CANCELLED: 'Cancelado',
  };
  return map[status] || status;
}

// Color del badge según estado
export function statusColor(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'badge-warning',
    PAID: 'badge-success',
    LOST_PAID: 'badge-danger',
    CANCELLED: 'badge-neutral',
  };
  return map[status] || 'badge-neutral';
}

// Generar clase CN (className helper simple)
export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

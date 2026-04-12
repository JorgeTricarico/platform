import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = '$'): string {
  return `${currency}${amount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-').map(Number);
  const date = new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateLong(dateStr: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-').map(Number);
  const date = new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function today(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

export function isOverdue(dateStr: string, status: string): boolean {
  if (status === 'entregado' || status === 'cancelado' || status === 'completado') return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  return d < now;
}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

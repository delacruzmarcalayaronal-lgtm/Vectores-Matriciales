export function formatCurrency(value: number): string {
  return `S/ ${value.toLocaleString('es-PE')}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('es-PE');
}

export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString('es-PE');
}

export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleString('es-PE', { dateStyle: 'short' });
}

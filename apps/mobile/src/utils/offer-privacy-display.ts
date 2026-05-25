import type { RdvMaquetteCounterparty } from '@/utils/rdv-maquette-card-display';

function maskString(val: string, visibleStart = 1, visibleEnd = 0): string {
  const s = val.trim();
  if (!s) return '••••••';
  if (s.length <= visibleStart + visibleEnd) return '••••••';
  const start = s.slice(0, visibleStart);
  const end = visibleEnd > 0 ? s.slice(-visibleEnd) : '';
  const mid = '•'.repeat(Math.min(6, s.length - visibleStart - visibleEnd));
  return start + mid + end;
}

/** Prénom / nom partiellement masqués tant que l’offre n’est pas acceptée (aligné web). */
export function maskOfferSensitiveName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '••••••';
  if (parts.length === 1) return maskString(parts[0], 1, 0);
  return `${maskString(parts[0], 1, 0)} ${maskString(parts[parts.length - 1], 1, 0)}`.trim();
}

export function maskOfferCounterparty(
  counterparty: RdvMaquetteCounterparty | null,
): RdvMaquetteCounterparty | null {
  if (!counterparty?.name?.trim()) return counterparty;
  return {
    ...counterparty,
    name: maskOfferSensitiveName(counterparty.name),
  };
}

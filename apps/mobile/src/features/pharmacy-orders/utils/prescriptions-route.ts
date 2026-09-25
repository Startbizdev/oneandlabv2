export type PharmacyOrderDetailMode = 'sent' | 'received';

export function pharmacyOrderPrescriptionsPath(
  rolePrefix: '/(pro)' | '/(nurse)' | undefined,
  mode: PharmacyOrderDetailMode,
  orderId: string,
): string | null {
  if (!rolePrefix || !orderId) return null;
  if (mode === 'received' && rolePrefix === '/(pro)') {
    return `${rolePrefix}/commandes-recues/${orderId}/ordonnances`;
  }
  return `${rolePrefix}/commandes-pharmacie/${orderId}/ordonnances`;
}

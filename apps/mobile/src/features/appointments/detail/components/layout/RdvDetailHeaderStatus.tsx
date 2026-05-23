import { StatusBadge } from '@/components/ui/Badge';

/** Badge statut informatif (non cliquable). */
export function RdvDetailHeaderStatus({ status }: { status: string }) {
  return <StatusBadge status={status} size="sm" />;
}

import type { ClinicalVitalReading } from '@oneandlab/shared-types';

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Date compacte pour les cartes grille (évite « Aujourd'hui… » tronqué). */
export function formatClinicalVitalCardDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const sameDay = startOfDay(d).getTime() === startOfDay(now).getTime();
  if (sameDay) return time;

  const dayDiff = Math.round((startOfDay(now).getTime() - startOfDay(d).getTime()) / 86400000);
  if (dayDiff === 1) return `Hier ${time}`;
  if (dayDiff > 1 && dayDiff < 7) {
    const wd = d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace(/\.$/, '');
    return `${wd} ${time}`;
  }

  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' });
}

/** Date lisible dans l'historique détaillé. */
export function formatClinicalVitalHistoryDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const sameDay = startOfDay(d).getTime() === startOfDay(now).getTime();
  if (sameDay) return `Aujourd'hui à ${time}`;

  const dayDiff = Math.round((startOfDay(now).getTime() - startOfDay(d).getTime()) / 86400000);
  if (dayDiff === 1) return `Hier à ${time}`;

  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** @deprecated Préférer formatClinicalVitalCardDate ou formatClinicalVitalHistoryDate */
export function formatClinicalVitalRecordedAt(iso: string): string {
  return formatClinicalVitalHistoryDate(iso);
}

export function formatClinicalVitalRecorderName(reading: ClinicalVitalReading): string {
  const name = reading.recorded_by?.name?.trim();
  return name || 'Professionnel';
}

export function formatClinicalVitalCardValue(reading: ClinicalVitalReading): string {
  if (reading.vital_type === 'blood_pressure' && reading.value_secondary != null) {
    return `${trimNum(reading.value)}/${trimNum(reading.value_secondary)}`;
  }
  return trimNum(reading.value);
}

function trimNum(n: number): string {
  if (Math.abs(n - Math.round(n)) < 0.001) return String(Math.round(n));
  return String(Number(n.toFixed(1)));
}

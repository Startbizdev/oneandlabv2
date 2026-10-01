import { useCallback, useState } from 'react';
import { useToast } from '@/providers/ToastProvider';
import type { NurseTourStop } from '../api/nurse-tour.service';
import type { TourCalendarImportScope } from '../components/TourCalendarImportSheet';
import { importTourToDeviceCalendar, type TourCalendarAddResult } from '../utils/tour-calendar';

function importResultToast(result: TourCalendarAddResult): { message: string; ok: boolean } {
  if (result.ok && result.mode === 'native') {
    return {
      message: `${result.count} rendez-vous ajouté${result.count > 1 ? 's' : ''} à votre calendrier`,
      ok: true,
    };
  }
  if (result.ok) {
    return { message: 'Choisissez Calendrier pour importer vos rendez-vous', ok: true };
  }
  if (result.reason === 'no_events') {
    return { message: 'Aucun rendez-vous à ajouter au calendrier', ok: false };
  }
  if (result.reason === 'permission') {
    return { message: 'Autorisez Cary à accéder à votre calendrier dans Réglages', ok: false };
  }
  return { message: 'Ajout au calendrier impossible', ok: false };
}

/** Import de la tournée (jour affiché ou période) dans le calendrier de l'appareil. */
export function useTourCalendarImport(date: string, todayStops: NurseTourStop[]) {
  const { show: showToast } = useToast();
  const [importing, setImporting] = useState(false);

  const importToCalendar = useCallback(
    async (scope: TourCalendarImportScope) => {
      setImporting(true);
      try {
        const { message, ok } = importResultToast(
          await importTourToDeviceCalendar({ scope, date, todayStops }),
        );
        showToast(message, { type: ok ? 'success' : 'error' });
      } catch (e) {
        console.warn('[tour] import calendrier impossible', e);
        showToast('Ajout au calendrier impossible', { type: 'error' });
      } finally {
        setImporting(false);
      }
    },
    [date, showToast, todayStops],
  );

  return { importing, importToCalendar };
}

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { countTourActiveRemainingStops } from '@oneandlab/shared-utils';
import { Button } from '@/components/ui/Button';
import { NurseNextPassageCard } from '@/features/tournee-nurse/components/NurseNextPassageCard';
import {
  findNextTourStop,
  nurseTourQueryOptions,
  todayTourDate,
  withDerivedSummary,
} from '@/features/tournee-nurse/hooks/nurse-tour-query';
import { useNurseTourStopCompletion } from '@/features/tournee-nurse/hooks/use-nurse-tour-stop-status';
import { useTourOrigin } from '@/features/tournee-nurse/hooks/use-tour-origin';
import { NurseTourBanner } from './NurseTourBanner';

const TOUR_HREF = '/(nurse)/tournee';

/** Accueil infirmier : prochain passage du jour (actions terrain), sinon accès à la tournée. */
export function NurseTodayTourCard() {
  const router = useRouter();
  const date = todayTourDate();
  const { getOrigin, refreshOrigin } = useTourOrigin({ requestPermission: false });
  const tourQ = useQuery({ ...nurseTourQueryOptions(date, getOrigin), select: withDerivedSummary });
  const { markDone } = useNurseTourStopCompletion(date);

  useEffect(() => {
    void refreshOrigin();
  }, [refreshOrigin]);

  const tour = tourQ.data;
  const nextStop = findNextTourStop(tour);

  if (tour && nextStop) {
    return (
      <NurseNextPassageCard
        tour={tour}
        stop={nextStop}
        onMarkDone={markDone}
        footer={
          <Button
            title="Voir toute la tournée"
            variant="ghost"
            fullWidth
            onPress={() => router.push(TOUR_HREF as never)}
          />
        }
      />
    );
  }

  return <NurseTourBanner remainingToday={tour ? countTourActiveRemainingStops(tour.stops) : undefined} />;
}

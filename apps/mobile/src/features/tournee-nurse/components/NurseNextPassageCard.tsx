import type { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import type { NurseTourPayload, NurseTourStop } from '../api/nurse-tour.service';
import { nursePassageDetailHref } from '../utils/passage-detail-href';
import { parseNavAppPref } from '../utils/tour-navigation';
import { nurseTourStopTimeLabel } from '../utils/tour-stop-time-label';
import { TourStopCard } from './TourStopCard';
import { TourStopCareSection } from './TourStopCareSection';

type Props = {
  tour: NurseTourPayload;
  stop: NurseTourStop;
  onMarkDone: (stop: NurseTourStop) => Promise<void>;
  footer?: ReactNode;
};

/** Prochain passage infirmier épinglé (accueil et tournée). */
export function NurseNextPassageCard({ tour, stop, onMarkDone, footer }: Props) {
  const router = useRouter();
  const index = tour.stops.findIndex((s) => s.stop_id === stop.stop_id);
  const eyebrow =
    index >= 0 && tour.stops.length > 1
      ? `Prochain passage · ${index + 1} sur ${tour.stops.length}`
      : 'Prochain passage';

  return (
    <TourStopCard
      stop={stop}
      timeLabel={nurseTourStopTimeLabel(stop)}
      navAppPref={parseNavAppPref(tour.plan.nav_app_pref)}
      eyebrow={eyebrow}
      care={<TourStopCareSection stop={stop} embedded listCompact />}
      onPress={() => router.push(nursePassageDetailHref(stop) as never)}
      onMarkDone={() => onMarkDone(stop)}
      footer={footer}
    />
  );
}

import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import { EmptyState } from '@/components/ui/EmptyState';

type Props = {
  date: string;
};

function dateLabel(iso: string): string {
  const today = dayjs().format('YYYY-MM-DD');
  if (iso === today) return 'aujourd’hui';
  if (iso === dayjs(today).add(1, 'day').format('YYYY-MM-DD')) return 'demain';
  return `le ${dayjs(iso).format('dddd D MMMM')}`;
}

export function TourEmptyPanel({ date }: Props) {
  const router = useRouter();
  return (
    <EmptyState
      illustration="tour"
      title={`Aucun passage ${dateLabel(date)}`}
      description="Ajoutez un passage avec le bouton +."
      actionLabel="Voir mes rendez-vous"
      onAction={() => router.push('/(nurse)/(tabs)/appointments')}
    />
  );
}

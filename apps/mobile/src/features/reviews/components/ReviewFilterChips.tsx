import { FullWidthSegmentBar, type FullWidthSegment } from '@/components/ui/FullWidthSegmentBar';
import type { ReviewFilter } from '@/features/reviews/types';

interface Props {
  value: ReviewFilter;
  onChange: (v: ReviewFilter) => void;
  counts?: Partial<Record<ReviewFilter, number>>;
}

export function ReviewFilterChips({ value, onChange, counts }: Props) {
  const segments: FullWidthSegment<ReviewFilter>[] = [
    { id: 'all', label: 'Tous' },
    { id: 'pending', label: 'À répondre', badge: counts?.pending },
    { id: 'answered', label: 'Répondus' },
  ];
  return (
    <FullWidthSegmentBar
      segments={segments}
      value={value}
      onChange={onChange}
      accessibilityLabel="Filtrer les avis"
    />
  );
}

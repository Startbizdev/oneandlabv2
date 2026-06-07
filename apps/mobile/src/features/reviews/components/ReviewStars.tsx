import { RatingStars } from './RatingStars';

interface Props {
  rating: number;
  size?: number;
  showValue?: boolean;
  max?: number;
}

/** Affichage lecture seule — délègue à {@link RatingStars}. */
export function ReviewStars({ rating, size = 16, showValue = true, max = 5 }: Props) {
  const mappedSize = size >= 28 ? 'lg' : size >= 20 ? 'md' : 'sm';

  return (
    <RatingStars
      value={rating}
      readonly
      size={mappedSize}
      max={max}
      showValue={showValue}
    />
  );
}

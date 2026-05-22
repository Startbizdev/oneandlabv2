import { StyleSheet, Text, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const STAR_COLOR = '#F59E0B';

interface Props {
  rating: number;
  size?: number;
  showValue?: boolean;
  max?: number;
}

export function ReviewStars({ rating, size = 16, showValue = true, max = 5 }: Props) {
  const val = Math.min(max, Math.max(0, Math.round(rating)));
  return (
    <View style={styles.row}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < val;
        return (
          <Star
            key={i}
            size={size}
            color={filled ? STAR_COLOR : colors.border}
            fill={filled ? STAR_COLOR : 'transparent'}
            strokeWidth={1.5}
          />
        );
      })}
      {showValue ? <Text style={[styles.value, { fontSize: size * 0.75 }]}>{val}/{max}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  value: {
    fontFamily: fontFamily.semiBold,
    color: '#B45309',
    marginLeft: spacing[1],
  },
});

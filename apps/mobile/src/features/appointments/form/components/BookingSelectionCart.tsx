import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import {
  selectionDetailActionLabel,
  selectionHeadline,
} from '../utils/selected-service-detail-lines';
import { colors, elevation, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  count: number;
  onPress: () => void;
}

export function BookingSelectionCart({ count, onPress }: Props) {
  const headline = selectionHeadline(count);
  const detailLabel = selectionDetailActionLabel(count);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${headline}. ${detailLabel}`}
      style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.badge}
        >
          <Text style={styles.badgeNum}>{count}</Text>
        </LinearGradient>
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>
            {headline}
          </Text>
          <View style={styles.linkRow}>
            <Text style={styles.link} numberOfLines={1}>
              {detailLabel}
            </Text>
            <ChevronRight size={13} color={colors.primaryDark} strokeWidth={2.5} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const BADGE = 32;

const styles = StyleSheet.create({
  hit: {
    flexShrink: 0,
    maxWidth: '46%',
  },
  pressed: {
    opacity: 0.9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
  },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...elevation.sm,
    shadowColor: colors.gradientEnd,
    shadowOpacity: 0.28,
  },
  badgeNum: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.textInverse,
  },
  copy: {
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    letterSpacing: -0.1,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  link: {
    flexShrink: 1,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.primaryDark,
  },
});

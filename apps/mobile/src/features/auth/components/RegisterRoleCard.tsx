import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  label: string;
  description: string;
  Icon: LucideIcon;
  accentColor: string;
  accentBg: string;
  onPress: () => void;
}

export function RegisterRoleCard({
  label,
  description,
  Icon,
  accentColor,
  accentBg,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${description}`}
    >
      <View style={[styles.accent, { backgroundColor: accentColor }]} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.iconWrap, { backgroundColor: accentBg }]}>
            <Icon size={22} color={accentColor} strokeWidth={2} />
          </View>
          <Text style={styles.label}>{label}</Text>
          <ChevronRight size={20} color={colors.textTertiary} strokeWidth={2} />
        </View>
        <Text style={styles.description}>{description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  cardPressed: {
    borderColor: colors.primaryMid,
    backgroundColor: colors.primaryLight,
  },
  accent: {
    width: 4,
  },
  content: {
    flex: 1,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: fontSize.md * 1.3,
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.5,
    width: '100%',
  },
});

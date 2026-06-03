import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, MessageCircle } from 'lucide-react-native';
import type { CareExchangeHintContent } from '../../utils/care-photo-copy';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  hint: CareExchangeHintContent;
  onPress: () => void;
}

export function CareExchangeHintBanner({ hint, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${hint.title}. ${hint.body}`}
      accessibilityHint="Ouvre l’onglet Échange"
    >
      <View style={styles.iconWrap}>
        <MessageCircle size={22} color={colors.primary} strokeWidth={2.25} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{hint.title}</Text>
        <Text style={styles.text}>{hint.body}</Text>
      </View>
      <ChevronRight size={20} color={colors.primary} strokeWidth={2.25} style={styles.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    padding: spacing[3.5],
    backgroundColor: colors.primaryLight,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primaryMid,
  },
  cardPressed: {
    opacity: 0.92,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1],
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.primaryDark,
  },
  text: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.45,
  },
  chevron: {
    marginTop: 2,
    flexShrink: 0,
  },
});

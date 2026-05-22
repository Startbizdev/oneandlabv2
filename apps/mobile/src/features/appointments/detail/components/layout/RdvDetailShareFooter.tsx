import { useMemo } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Share2 } from 'lucide-react-native';
import type { ShareForNurseData } from '../../api/appointment-detail.service';
import { buildNurseShareMessage } from '../../utils/nurse-share-message';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  shareData?: ShareForNurseData | null;
  /** Message déjà assemblé (prioritaire sur shareData). */
  shareText?: string;
  loading?: boolean;
}

/** Partage RDV — CTA gradient (identité Cary). */
export function RdvDetailShareFooter({ shareData, shareText: shareTextProp, loading }: Props) {
  const shareText = useMemo(
    () => shareTextProp?.trim() || buildNurseShareMessage(shareData),
    [shareData, shareTextProp],
  );
  const disabled = loading || !shareText;

  return (
    <View style={styles.wrap}>
      <Pressable
        disabled={disabled}
        onPress={() => {
          if (shareText) void Share.share({ message: shareText });
        }}
        style={({ pressed }) => [styles.pressable, pressed && !disabled && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Partager le rendez-vous"
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.gradient, disabled && styles.gradientDisabled]}
        >
          {loading ? (
            <ActivityIndicator color={colors.textInverse} size="small" />
          ) : (
            <>
              <Share2 size={18} color={colors.textInverse} strokeWidth={2.25} />
              <Text style={styles.btnText}>Partager le rendez-vous</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing[2],
  },
  pressable: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...elevation.sm,
    shadowColor: '#16B6D6',
    shadowOpacity: 0.2,
  },
  pressed: {
    opacity: 0.92,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[4],
    minHeight: 52,
    borderRadius: radius.lg,
  },
  gradientDisabled: {
    opacity: 0.55,
  },
  btnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textInverse,
  },
});

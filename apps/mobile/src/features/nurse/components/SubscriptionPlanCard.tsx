import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { Platform, View } from 'react-native';
import { Row, Stack } from '@/components/layout/primitives';
import { Check } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { elevation, radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export type SubscriptionPlanCardProps = {
  name: string;
  /** Montant affiché, ex. « 29 € » ou « 0 € » */
  priceAmount: string;
  /** Suffixe tarifaire, ex. « /mois » */
  priceSuffix?: string;
  tagline: string;
  features: string[];
  footnote?: string;
  isCurrent?: boolean;
  recommended?: boolean;
  ctaLabel?: string;
  ctaVariant?: 'primary' | 'outline';
  ctaLoading?: boolean;
  onCtaPress?: () => void;
  disabled?: boolean;
};

export function SubscriptionPlanCard({
  name,
  priceAmount,
  priceSuffix = '/mois',
  tagline,
  features,
  footnote,
  isCurrent,
  recommended,
  ctaLabel,
  ctaVariant = 'primary',
  ctaLoading,
  onCtaPress,
  disabled,
}: SubscriptionPlanCardProps) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'SubscriptionPlanCard');

  const showRecommended = recommended && !isCurrent;

  return (
    <View
      style={[
        styles.card,
        elevation.xs,
        showRecommended && styles.cardRecommended,
        isCurrent && styles.cardCurrent,
      ]}
    >
      {(showRecommended || isCurrent) && (
        <Row style={styles.badgeRow}>
          {showRecommended ? (
            <View style={styles.badgeRecommended}>
              <AppText style={styles.badgeRecommendedText}>Recommandé</AppText>
            </View>
          ) : null}
          {isCurrent ? (
            <View style={styles.badgeCurrent}>
              <AppText style={styles.badgeCurrentText}>Votre offre</AppText>
            </View>
          ) : null}
        </Row>
      )}

      <Stack gap={spacing[3]} style={styles.body}>
        <Stack gap={spacing[1]}>
          <AppText style={styles.name}>{name}</AppText>

          <View style={styles.priceBlock}>
            <AppText
              style={styles.priceAmount}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
              numberOfLines={1}
              accessibilityLabel={`${priceAmount} ${priceSuffix}`}
            >
              {priceAmount}
            </AppText>
            <AppText style={styles.priceSuffix}>{priceSuffix}</AppText>
          </View>

          <AppText style={styles.tagline}>{tagline}</AppText>
        </Stack>

        <Stack gap={spacing[2.5]} style={styles.features}>
          {features.map((feature) => (
            <Row key={feature} style={styles.featureRow} align="start">
              <View style={styles.check}>
                <Check size={iconSize['2xs']} color={c.primary} strokeWidth={3} />
              </View>
              <AppText style={styles.featureText}>{feature}</AppText>
            </Row>
          ))}
        </Stack>

        {ctaLabel && onCtaPress ? (
          <Stack gap={spacing[2]}>
            <Button
              title={ctaLabel}
              variant={ctaVariant}
              size="lg"
              fullWidth
              loading={ctaLoading}
              disabled={disabled}
              onPress={onCtaPress}
            />
            {footnote ? <AppText style={styles.footnote}>{footnote}</AppText> : null}
          </Stack>
        ) : footnote ? (
          <AppText style={styles.footnote}>{footnote}</AppText>
        ) : null}
      </Stack>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    card: {
      minWidth: 0,
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: spacing[5],
      ...Platform.select({
        ios: { borderCurve: 'continuous' as const },
        default: {},
      }),
    },
    cardRecommended: {
      borderColor: c.primary,
      borderWidth: 2,
    },
    cardCurrent: {
      borderColor: c.textTertiary,
    },
    badgeRow: {
      flexWrap: 'wrap' as const,
      gap: spacing[2],
      marginBottom: spacing[3],
    },
    badgeRecommended: {
      backgroundColor: c.primary,
      paddingHorizontal: spacing[2.5],
      paddingVertical: spacing[1],
      borderRadius: radius.full,
    },
    badgeRecommendedText: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.xs,
      color: c.onPrimary,
      letterSpacing: 0.3,
    },
    badgeCurrent: {
      backgroundColor: c.surfaceAlt,
      paddingHorizontal: spacing[2.5],
      paddingVertical: spacing[1],
      borderRadius: radius.full,
    },
    badgeCurrentText: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.xs,
      color: c.textSecondary,
      letterSpacing: 0.3,
    },
    body: {
      minWidth: 0,
    },
    name: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.xl,
      color: c.textPrimary,
      letterSpacing: -0.2,
    },
    priceBlock: {
      minWidth: 0,
      alignSelf: 'flex-start' as const,
      maxWidth: '100%' as const,
      gap: spacing[0.5],
      paddingTop: spacing[1],
    },
    priceAmount: {
      fontFamily: fontFamily.extraBold,
      fontSize: fontSize['4xl'],
      lineHeight: fontSize['4xl'] * 1.08,
      color: c.textPrimary,
      letterSpacing: -0.8,
      flexShrink: 1,
    },
    priceSuffix: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.base,
      color: c.textSecondary,
      lineHeight: fontSize.base * 1.35,
    },
    tagline: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.45,
      marginTop: spacing[1],
    },
    features: {
      minWidth: 0,
      paddingTop: spacing[1],
    },
    featureRow: {
      gap: spacing[2.5],
      minWidth: 0,
    },
    check: {
      width: 22,
      height: 22,
      borderRadius: radius.full,
      backgroundColor: c.primaryLight,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginTop: 1,
      flexShrink: 0,
    },
    featureText: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.45,
    },
    footnote: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      lineHeight: fontSize.xs * 1.5,
      textAlign: 'center' as const,
    },
  };
}

import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { View } from 'react-native';
import { Cluster, Row } from '@/components/layout/primitives';
import { Check } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { elevation, radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export type SubscriptionPlanCardProps = {
  name: string;
  price: string;
  priceSuffix?: string;
  tagline: string;
  features: string[];
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
  price,
  priceSuffix = '/mois',
  tagline,
  features,
  isCurrent,
  recommended,
  ctaLabel,
  ctaVariant = 'primary',
  ctaLoading,
  onCtaPress,
  disabled,
}: SubscriptionPlanCardProps) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_nurse_components_SubscriptionPlanCard_tsx_styles');
  return (
    <View
      style={[
        styles.card,
        elevation.xs,
        recommended && styles.cardRecommended,
        isCurrent && styles.cardCurrent,
      ]}
    >
      {recommended ? (
        <View style={styles.badge}>
          <AppText style={styles.badgeText}>Recommandé</AppText>
        </View>
      ) : null}
      {isCurrent ? (
        <View style={[styles.badge, styles.badgeCurrent]}>
          <AppText style={[styles.badgeText, styles.badgeTextCurrent]}>Votre offre</AppText>
        </View>
      ) : null}

      <AppText style={styles.name}>{name}</AppText>
      <Row align="baseline" gap={spacing[1]}>
        <AppText style={styles.price}>{price}</AppText>
        <AppText style={styles.priceSuffix}>{priceSuffix}</AppText>
      </Row>
      <AppText style={styles.tagline}>{tagline}</AppText>

      <View style={styles.features}>
        {features.map((f) => (
          <Cluster
            key={f}
            gap={spacing[2.5]}
            align="start"
            leading={
              <View style={styles.check}>
                <Check size={iconSize['2xs']} color={c.primary} strokeWidth={3} />
              </View>
            }
          >
            <AppText style={styles.featureText}>{f}</AppText>
          </Cluster>
        ))}
      </View>

      {ctaLabel && onCtaPress ? (
        <Button
          title={ctaLabel}
          variant={ctaVariant}
          size="lg"
          fullWidth
          loading={ctaLoading}
          disabled={disabled}
          onPress={onCtaPress}
        />
      ) : null}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: spacing[5],
    gap: spacing[3],
    overflow: 'visible' as const,
  },
  cardRecommended: {
    borderColor: c.primary,
    borderWidth: 2,
  },
  cardCurrent: {
    borderColor: c.textTertiary,
  },
  badge: {
    position: 'absolute' as const,
    top: spacing[3],
    right: spacing[3],
    backgroundColor: c.primary,
    paddingHorizontal: spacing[2.5],
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeCurrent: {
    backgroundColor: c.surfaceAlt,
  },
  badgeText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    color: c.textInverse,
    letterSpacing: 0.3,
  },
  badgeTextCurrent: {
    color: c.textSecondary,
  },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: c.textPrimary,
    paddingRight: 72,
  },
  price: {
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize['3xl'],
    color: c.textPrimary,
    letterSpacing: -0.5,
  },
  priceSuffix: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  tagline: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  features: {
    gap: spacing[2.5],
    marginTop: spacing[1],
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: c.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 1,
  },
  featureText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: 20,
  },
};
}


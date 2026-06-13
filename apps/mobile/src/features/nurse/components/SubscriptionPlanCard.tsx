import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { Text, View } from 'react-native';
import { Cluster, Row } from '@/components/layout/primitives';
import { Check } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export type SubscriptionPlanCardProps = {
  name: string;
  price: string;
  priceSuffix?: string;
  priceNote?: string;
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
  priceNote,
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
          <Text style={styles.badgeText}>Recommandé</Text>
        </View>
      ) : null}
      {isCurrent ? (
        <View style={[styles.badge, styles.badgeCurrent]}>
          <Text style={[styles.badgeText, styles.badgeTextCurrent]}>Votre offre</Text>
        </View>
      ) : null}

      <Text style={styles.name}>{name}</Text>
      <Row align="baseline" gap={spacing[1]}>
        <Text style={styles.price}>{price}</Text>
        <Text style={styles.priceSuffix}>{priceSuffix}</Text>
      </Row>
      {priceNote ? <Text style={styles.priceNote}>{priceNote}</Text> : null}
      <Text style={styles.tagline}>{tagline}</Text>

      <View style={styles.features}>
        {features.map((f) => (
          <Cluster
            key={f}
            gap={spacing[2.5]}
            align="start"
            leading={
              <View style={styles.check}>
                <Check size={12} color={c.primary} strokeWidth={3} />
              </View>
            }
          >
            <Text style={styles.featureText}>{f}</Text>
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
  priceNote: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    lineHeight: 16,
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


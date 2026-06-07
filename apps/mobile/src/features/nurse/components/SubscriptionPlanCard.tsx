import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { elevation, radius, spacing } from '@/theme';
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
      <View style={styles.priceRow}>
        <Text style={styles.price}>{price}</Text>
        <Text style={styles.priceSuffix}>{priceSuffix}</Text>
      </View>
      <Text style={styles.tagline}>{tagline}</Text>

      <View style={styles.features}>
        {features.map((f) => (
          <View key={f} style={styles.featureRow}>
            <View style={styles.check}>
              <Check size={12} color={colors.primary} strokeWidth={3} />
            </View>
            <Text style={styles.featureText}>{f}</Text>
          </View>
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
    overflow: 'visible',
  },
  cardRecommended: {
    borderColor: c.primary,
    borderWidth: 2,
  },
  cardCurrent: {
    borderColor: c.textTertiary,
  },
  badge: {
    position: 'absolute',
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
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing[1],
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
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2.5],
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: c.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  featureText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: 20,
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_nurse_components_SubscriptionPlanCard_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});

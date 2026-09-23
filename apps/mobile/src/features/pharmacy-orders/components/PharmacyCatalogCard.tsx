import type { AppColors } from '@/theme/colors';
import { useAppColors } from '@/theme/use-app-colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { Pressable, View } from 'react-native';
import { Cluster, Row } from '@/components/layout/primitives';
import { MapPin, Star, Store } from 'lucide-react-native';
import type { PharmacyCatalogItem } from '@oneandlab/shared-types';
import { PHARMACY_FULFILLMENT_LABELS } from '@oneandlab/shared-constants';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  item: PharmacyCatalogItem;
  selected?: boolean;
  favorite?: boolean;
  fulfillmentMode: 'click_collect' | 'home_delivery';
  onPress: () => void;
  onToggleFavorite?: () => void;
  favoriteLoading?: boolean;
}

export function PharmacyCatalogCard({
  item,
  selected = false,
  favorite = false,
  fulfillmentMode,
  onPress,
  onToggleFavorite,
  favoriteLoading = false,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PharmacyCatalogCard');

  const addressLine =
    item.address?.formatted_address ??
    item.address?.label ??
    [item.address?.postal_code, item.address?.city].filter(Boolean).join(' ') ??
    item.postal_code;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, selected && styles.cardSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Cluster
        gap={spacing[3]}
        leading={
          <View style={[styles.iconBox, selected && styles.iconBoxSelected]}>
            <Store size={iconSize.md} color={selected ? c.primary : c.textSecondary} strokeWidth={2} />
          </View>
        }
        actions={
          onToggleFavorite ? (
            <IconActionButton
              label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              onPress={onToggleFavorite}
              loading={favoriteLoading}
            >
              <Star
                size={iconSize.md}
                color={favorite ? c.warning : c.textTertiary}
                fill={favorite ? c.warning : 'transparent'}
                strokeWidth={2}
              />
            </IconActionButton>
          ) : null
        }
      >
        <View style={styles.body}>
          <Row gap={spacing[2]} align="center">
            <AppText style={[styles.title, selected && styles.titleSelected]} numberOfLines={2}>
              {item.display_name}
            </AppText>
          </Row>
          {item.emploi ? (
            <AppText style={styles.meta} numberOfLines={1}>
              {item.emploi}
            </AppText>
          ) : null}
          {addressLine ? (
            <Row gap={spacing[1]} align="start" style={styles.addressRow}>
              <MapPin size={iconSize.xs} color={c.textTertiary} strokeWidth={2} />
              <AppText style={styles.address} numberOfLines={2}>
                {addressLine}
              </AppText>
            </Row>
          ) : null}
          <AppText style={styles.modeHint}>
            {fulfillmentMode === 'click_collect'
              ? PHARMACY_FULFILLMENT_LABELS.click_collect
              : PHARMACY_FULFILLMENT_LABELS.home_delivery}
          </AppText>
        </View>
      </Cluster>
    </Pressable>
  );
}

function buildStyles(c: AppColors) {
  return {
    card: {
      padding: spacing[3],
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    cardSelected: {
      borderColor: c.primaryMid,
      backgroundColor: c.primaryLight,
    },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.surfaceSubtle,
    },
    iconBoxSelected: {
      backgroundColor: c.surface,
    },
    body: {
      minWidth: 0,
      flex: 1,
      gap: spacing[1],
    },
    title: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.md,
      color: c.textPrimary,
    },
    titleSelected: {
      color: c.primaryDark,
    },
    meta: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    addressRow: {
      marginTop: spacing[0.5],
    },
    address: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.4,
    },
    modeHint: {
      marginTop: spacing[1],
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      color: c.primary,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.3,
    },
  };
}

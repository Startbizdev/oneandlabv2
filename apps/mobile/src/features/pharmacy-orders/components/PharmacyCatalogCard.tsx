import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, StyleSheet, View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { Star } from 'lucide-react-native';
import type { PharmacyCatalogItem } from '@oneandlab/shared-types';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { ICON_STROKE_WIDTH, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

interface Props {
  item: PharmacyCatalogItem;
  selected?: boolean;
  favorite?: boolean;
  onPress: () => void;
  onToggleFavorite?: () => void;
  favoriteLoading?: boolean;
}

/** Pharmacie du catalogue (assistant de commande) : sélection et favori. */
export function PharmacyCatalogCard({
  item,
  selected = false,
  favorite = false,
  onPress,
  onToggleFavorite,
  favoriteLoading = false,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  const addressLine =
    item.address?.formatted_address ??
    item.address?.label ??
    [item.address?.postal_code, item.address?.city].filter(Boolean).join(' ') ??
    item.postal_code;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, selected && styles.cardSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={item.display_name}
    >
      <Cluster
        gap={spacing[3]}
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
                strokeWidth={ICON_STROKE_WIDTH}
              />
            </IconActionButton>
          ) : null
        }
      >
        <View style={styles.body}>
          <AppText style={styles.title}>{item.display_name}</AppText>
          {item.emploi ? <AppText variant="secondary">{item.emploi}</AppText> : null}
          {addressLine ? <AppText variant="caption">{addressLine}</AppText> : null}
        </View>
      </Cluster>
    </Pressable>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    card: {
      padding: spacing[4],
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      backgroundColor: c.surface,
    },
    cardSelected: {
      borderWidth: 1.5,
      borderColor: c.primary,
      backgroundColor: c.primaryLight,
    },
    body: {
      minWidth: 0,
      flex: 1,
      gap: spacing[0.5],
    },
    title: {
      ...font.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
  };
}

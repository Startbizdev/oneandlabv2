import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { PharmacyOrder } from '@oneandlab/shared-types';
import { Row } from '@/components/layout/primitives';
import { Badge } from '@/components/ui/Badge';
import {
  formatPharmacyOrderDate,
  pharmacyFulfillmentLabel,
  pharmacyOrderBeneficiaryLabel,
  pharmacyOrderOrderedByLabel,
  pharmacyOrderPharmacyLabel,
  pharmacyOrderStatusBadgeVariant,
  pharmacyOrderStatusLabel,
} from '../utils/order-display';
import { ICON_STROKE_WIDTH, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

interface Props {
  order: PharmacyOrder;
  variant: 'sent' | 'received';
  /** Vue du patient sur ses propres traitements : titre = pharmacie, demandeur affiché. */
  patientView?: boolean;
  onPress: () => void;
}

/** Carte de commande pharmacie : bénéficiaire, interlocuteur, mode, statut. */
export function PharmacyOrderCard({ order, variant, patientView = false, onPress }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const patientLabel = pharmacyOrderBeneficiaryLabel(order);
  const pharmacyLabel = pharmacyOrderPharmacyLabel(order);
  const relativeName = order.relative_display_name?.trim();
  const title = patientView ? pharmacyLabel : patientLabel;
  const counterpart = patientView
    ? relativeName
      ? `Pour ${relativeName}`
      : null
    : variant === 'received'
      ? pharmacyOrderOrderedByLabel(order, null, { pharmacyView: true })
      : pharmacyLabel;
  const orderedBy = patientView && variant === 'sent' ? pharmacyOrderOrderedByLabel(order) : null;
  const deliveryLine =
    order.fulfillment_mode === 'home_delivery'
      ? order.delivery_address?.formatted_address?.trim() || order.delivery_address?.label?.trim() || null
      : null;
  const statusLabel = pharmacyOrderStatusLabel(order.status);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={
        patientView ? `Traitement ${pharmacyLabel}, ${statusLabel}` : `Commande pour ${patientLabel}, ${statusLabel}`
      }
    >
      <Row align="center" gap={spacing[3]}>
        <View style={styles.body}>
          <Row justify="between" align="start" gap={spacing[2]}>
            <AppText style={styles.patientName}>{title}</AppText>
            <Badge label={statusLabel} variant={pharmacyOrderStatusBadgeVariant(order.status)} size="sm" />
          </Row>
          {counterpart ? <AppText variant="secondary">{counterpart}</AppText> : null}
          {orderedBy ? <AppText variant="secondary">{orderedBy}</AppText> : null}
          <AppText variant="caption">
            {[pharmacyFulfillmentLabel(order.fulfillment_mode), formatPharmacyOrderDate(order.created_at)]
              .filter(Boolean)
              .join(' · ')}
          </AppText>
          {deliveryLine ? <AppText variant="caption">{deliveryLine}</AppText> : null}
        </View>
        <ChevronRight size={iconSize.sm} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
      </Row>
    </Pressable>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    card: {
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      backgroundColor: c.surface,
      padding: spacing[4],
    },
    cardPressed: { backgroundColor: c.surfaceAlt },
    body: { flex: 1, minWidth: 0, gap: spacing[1] },
    patientName: {
      flex: 1,
      minWidth: 0,
      ...font.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
  };
}

import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, View } from 'react-native';
import { ChevronRight, MapPin, Pill, UserRound } from 'lucide-react-native';
import type { PharmacyOrder } from '@oneandlab/shared-types';
import { Row } from '@/components/layout/primitives';
import {
  formatPharmacyOrderDate,
  pharmacyFulfillmentLabel,
  pharmacyOrderBeneficiaryLabel,
  pharmacyOrderOrderedByLabel,
  pharmacyOrderPharmacyLabel,
  pharmacyOrderStatusLabel,
} from '../utils/order-display';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  order: PharmacyOrder;
  variant: 'sent' | 'received';
  showOrderedBy?: boolean;
  onPress: () => void;
}

export function PharmacyOrderCard({ order, variant, showOrderedBy = false, onPress }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PharmacyOrderCard');
  const patientLabel = pharmacyOrderBeneficiaryLabel(order);
  const pharmacyLabel = pharmacyOrderPharmacyLabel(order);
  const orderedBy = showOrderedBy ? pharmacyOrderOrderedByLabel(order) : null;
  const deliveryLine =
    order.delivery_address?.formatted_address?.trim() ||
    order.delivery_address?.label?.trim() ||
    null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
    >
      <Row justify="between" align="start" gap={spacing[3]}>
        <View style={styles.iconWrap}>
          <Pill size={iconSize.mdSm} color={c.primary} strokeWidth={2} />
        </View>
        <View style={styles.body}>
          <Row justify="between" align="start" gap={spacing[2]}>
            <AppText style={styles.patientName} numberOfLines={2}>
              {patientLabel}
            </AppText>
            <AppText style={styles.date}>{formatPharmacyOrderDate(order.created_at)}</AppText>
          </Row>

          <Row gap={spacing[1.5]} align="center" style={styles.metaRow}>
            <UserRound size={iconSize.xs} color={c.textTertiary} strokeWidth={2} />
            <AppText style={styles.metaText} numberOfLines={1}>
              {variant === 'received' ? 'Commande reçue' : pharmacyLabel}
            </AppText>
          </Row>

          {orderedBy ? (
            <AppText style={styles.orderedBy} numberOfLines={2}>
              {orderedBy}
            </AppText>
          ) : null}

          <AppText style={styles.modeLine}>{pharmacyFulfillmentLabel(order.fulfillment_mode)}</AppText>

          {deliveryLine && order.fulfillment_mode === 'home_delivery' ? (
            <Row gap={spacing[1]} align="start" style={styles.addressRow}>
              <MapPin size={iconSize.xs} color={c.textTertiary} strokeWidth={2} style={styles.addressIcon} />
              <AppText style={styles.addressText} numberOfLines={2}>
                {deliveryLine}
              </AppText>
            </Row>
          ) : null}

          <View style={styles.statusBadge}>
            <AppText style={styles.statusText}>{pharmacyOrderStatusLabel(order.status)}</AppText>
          </View>
        </View>
        <ChevronRight size={iconSize.sm} color={c.textTertiary} strokeWidth={2} style={styles.chevron} />
      </Row>
    </Pressable>
  );
}

function buildStyles(c: AppColors) {
  return {
    card: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      padding: spacing[3.5],
      ...{
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      },
    },
    cardPressed: { opacity: 0.94 },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.primaryLight,
      marginTop: 2,
    },
    body: { flex: 1, minWidth: 0, gap: spacing[1] },
    patientName: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.md,
      color: c.textPrimary,
      lineHeight: fontSize.md * 1.25,
    },
    date: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      flexShrink: 0,
    },
    metaRow: { marginTop: spacing[0.5] },
    metaText: {
      flex: 1,
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textSecondary,
    },
    orderedBy: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      color: c.primaryDark,
      lineHeight: fontSize.xs * 1.35,
    },
    modeLine: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textTertiary,
    },
    addressRow: { marginTop: spacing[0.5] },
    addressIcon: { marginTop: 2 },
    addressText: {
      flex: 1,
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textSecondary,
      lineHeight: fontSize.xs * 1.4,
    },
    statusBadge: {
      alignSelf: 'flex-start' as const,
      marginTop: spacing[2],
      paddingHorizontal: spacing[2],
      paddingVertical: spacing[0.5],
      borderRadius: radius.full,
      backgroundColor: c.primaryLight,
    },
    statusText: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      color: c.primaryDark,
    },
    chevron: { marginTop: spacing[3] },
  };
}

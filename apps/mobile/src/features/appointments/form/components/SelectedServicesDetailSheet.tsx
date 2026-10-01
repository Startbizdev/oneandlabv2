import { useEffect, useState } from 'react';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, StyleSheet, View } from 'react-native';
import { Cluster, Row } from '@/components/layout/primitives';
import { Trash2 } from 'lucide-react-native';
import type { SelectedServiceInput } from '@oneandlab/shared-utils';
import { SheetModal } from '@/components/ui/SheetModal';
import { Button } from '@/components/ui/Button';
import type { CareCategory } from '@/features/categories/api/categories.service';
import { CareIcon } from '@/features/categories/components/CareIcon';
import { careSourceFromCatalog } from '@/features/categories/utils/care-source';
import type { BookingServiceFormSlice } from '../utils/booking-service-form-slice';
import {
  detailLinesForSelectedService,
  selectionModalTitle,
} from '../utils/selected-service-detail-lines';
import { ICON_STROKE_WIDTH, MIN_TOUCH_TARGET, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

interface Props {
  visible: boolean;
  selectedServices: SelectedServiceInput[];
  categories: CareCategory[];
  formDataByService?: Record<string, BookingServiceFormSlice | undefined>;
  onClose: () => void;
  onRemove: (serviceId: string) => void;
}

/** Détail du panier — retrait confirmé en ligne. */
export function SelectedServicesDetailSheet({
  visible,
  selectedServices,
  categories,
  formDataByService,
  onClose,
  onRemove,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) setPendingRemoveId(null);
  }, [visible]);

  const confirmRemove = (serviceId: string) => {
    setPendingRemoveId(null);
    onRemove(serviceId);
    if (selectedServices.length <= 1) onClose();
  };

  return (
    <SheetModal
      visible={visible}
      presentKey={selectedServices.map((s) => s.id).join(',') || 'empty'}
      onClose={onClose}
      onBack={onClose}
      title={selectionModalTitle(selectedServices.length)}
      subtitle="Vérifiez les options avant de continuer."
      footer={<Button title="Fermer" variant="secondary" onPress={onClose} fullWidth size="lg" />}
    >
      {selectedServices.map((svc, index) => {
        const lines = detailLinesForSelectedService(svc, categories, formDataByService);
        const isLast = index === selectedServices.length - 1;
        const confirming = pendingRemoveId === svc.id;

        return (
          <View key={svc.id} style={[styles.item, !isLast && styles.itemBorder]}>
            <Cluster
              leading={
                <CareIcon
                  care={careSourceFromCatalog(
                    { categoryId: svc.category_id, name: svc.name },
                    svc.type,
                    categories,
                  )}
                  variant="well"
                />
              }
              align="start"
              gap={spacing[3]}
              actions={
                confirming ? null : (
                  <Pressable
                    onPress={() => setPendingRemoveId(svc.id)}
                    style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
                    accessibilityLabel={`Retirer ${svc.name}`}
                    accessibilityRole="button"
                  >
                    <Trash2 size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
                  </Pressable>
                )
              }
            >
              <AppText variant="headline">{svc.name}</AppText>
              {lines.length > 0 ? (
                <View style={styles.details}>
                  {lines.map((ln, i) => (
                    <AppText key={`${svc.id}-${i}`} variant="secondary">
                      <AppText variant="secondary" style={styles.detailLabel}>{ln.label} </AppText>
                      {ln.value}
                    </AppText>
                  ))}
                </View>
              ) : (
                <AppText variant="secondary" style={styles.detailLabel}>Aucune option renseignée.</AppText>
              )}
            </Cluster>
            {confirming ? (
              <View style={styles.confirm}>
                <AppText variant="body" accessibilityRole="alert">Retirer ce soin de la demande ?</AppText>
                <Row gap={spacing[2]}>
                  <Button
                    title="Annuler"
                    variant="ghost"
                    onPress={() => setPendingRemoveId(null)}
                    style={styles.confirmBtn}
                  />
                  <Button
                    title="Retirer"
                    variant="destructive"
                    onPress={() => confirmRemove(svc.id)}
                    style={styles.confirmBtn}
                  />
                </Row>
              </View>
            ) : null}
          </View>
        );
      })}
    </SheetModal>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    item: {
      paddingVertical: spacing[3],
      gap: spacing[3],
    },
    itemBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderLight,
    },
    removeBtn: {
      width: MIN_TOUCH_TARGET,
      height: MIN_TOUCH_TARGET,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginTop: -spacing[2],
      marginRight: -spacing[2],
    },
    pressed: { opacity: 0.6 },
    details: {
      marginTop: spacing[1],
      gap: spacing[1],
    },
    detailLabel: {
      ...font.regular,
      color: c.textTertiary,
    },
    confirm: {
      gap: spacing[2],
      padding: spacing[3],
      borderRadius: radius.md,
      backgroundColor: c.surfaceAlt,
    },
    confirmBtn: { flex: 1 },
  };
}

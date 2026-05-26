import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import type { SelectedServiceInput } from '@oneandlab/shared-utils';
import { SheetModal } from '@/components/ui/SheetModal';
import { Button } from '@/components/ui/Button';
import type { CareCategory } from '@/features/categories/api/categories.service';
import type { BookingServiceFormSlice } from '../utils/booking-service-form-slice';
import {
  detailLinesForSelectedService,
  selectionModalTitle,
} from '../utils/selected-service-detail-lines';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  visible: boolean;
  selectedServices: SelectedServiceInput[];
  categories: CareCategory[];
  formDataByService?: Record<string, BookingServiceFormSlice | undefined>;
  onClose: () => void;
  onRemove: (serviceId: string) => void;
}

/** Détail du panier — SheetModal (Expo). */
export function SelectedServicesDetailSheet({
  visible,
  selectedServices,
  categories,
  formDataByService,
  onClose,
  onRemove,
}: Props) {
  const handleRemove = (svc: SelectedServiceInput) => {
    Alert.alert('Retirer ce soin ?', svc.name, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: () => {
          onRemove(svc.id);
          if (selectedServices.length <= 1) onClose();
        },
      },
    ]);
  };

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      onBack={onClose}
      title={selectionModalTitle(selectedServices.length)}
      subtitle="Vérifiez les options avant de continuer."
    >
      {selectedServices.map((svc, index) => {
        const lines = detailLinesForSelectedService(svc, categories, formDataByService);
        const isLast = index === selectedServices.length - 1;

        return (
          <View key={svc.id} style={[styles.item, !isLast && styles.itemBorder]}>
            <View style={styles.itemTop}>
              <Text style={styles.itemName} numberOfLines={2}>
                {svc.name}
              </Text>
              <Pressable
                onPress={() => handleRemove(svc)}
                hitSlop={8}
                accessibilityLabel={`Retirer ${svc.name}`}
              >
                <Trash2 size={16} color={colors.error} strokeWidth={2} />
              </Pressable>
            </View>
            {lines.length > 0 ? (
              <View style={styles.details}>
                {lines.map((ln, i) => (
                  <Text key={`${svc.id}-${i}`} style={styles.detailLine}>
                    <Text style={styles.detailLabel}>{ln.label} </Text>
                    <Text style={styles.detailValue}>{ln.value}</Text>
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.empty}>Aucune option renseignée.</Text>
            )}
          </View>
        );
      })}
      <Button title="Fermer" onPress={onClose} fullWidth size="lg" />
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  item: {
    paddingVertical: spacing[3],
  },
  itemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  itemName: {
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  details: {
    marginTop: spacing[2],
    paddingLeft: spacing[2.5],
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    gap: spacing[1],
  },
  detailLine: {
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs * 1.45,
  },
  detailLabel: {
    fontFamily: fontFamily.regular,
    color: colors.textTertiary,
  },
  detailValue: {
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  empty: {
    marginTop: spacing[1],
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
});

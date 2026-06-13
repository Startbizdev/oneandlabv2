import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
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
import { spacing } from '@/theme';
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
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'SelectedServicesDetailSheet');
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
      presentKey={selectedServices.map((s) => s.id).join(',') || 'empty'}
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
            <Cluster
              align="start"
              gap={spacing[2]}
              actions={
                <Pressable
                  onPress={() => handleRemove(svc)}
                  hitSlop={8}
                  style={styles.removeBtn}
                  accessibilityLabel={`Retirer ${svc.name}`}
                  accessibilityRole="button"
                >
                  <Trash2 size={20} color={c.error} strokeWidth={2} />
                </Pressable>
              }
            >
              <Text style={styles.itemName} numberOfLines={2}>
                {svc.name}
              </Text>
            </Cluster>
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

function buildStyles(c: AppColors) {
  return {
    item: {
      paddingVertical: spacing[3],
    },
    itemBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderLight,
    },
    itemName: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
      lineHeight: fontSize.base * 1.35,
    },
    removeBtn: {
      width: 44,
      height: 44,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginTop: -spacing[2],
      marginRight: -spacing[2],
    },
    details: {
      marginTop: spacing[2],
      paddingLeft: spacing[2.5],
      borderLeftWidth: 2,
      borderLeftColor: c.border,
      gap: spacing[1.5],
    },
    detailLine: {
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.45,
    },
    detailLabel: {
      fontFamily: fontFamily.regular,
      color: c.textTertiary,
    },
    detailValue: {
      fontFamily: fontFamily.medium,
      color: c.textSecondary,
    },
    empty: {
      marginTop: spacing[1],
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textTertiary,
      lineHeight: fontSize.sm * 1.4,
    },
  };
}

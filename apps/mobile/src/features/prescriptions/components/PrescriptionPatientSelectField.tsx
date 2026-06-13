import type { AppColors } from '@/theme/colors';
import { useAppColors } from '@/theme/use-app-colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { ChevronDown, PenLine, X } from 'lucide-react-native';
import type { PatientRow } from '@/features/patients/api/fetch-all-patients';
import { PrescriptionPatientSelectSheet } from './PrescriptionPatientSelectSheet';
import { patientDisplayName } from '@/features/patients/utils/patient-contact-display';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  patients: PatientRow[];
  selectedId: string;
  onSelect: (id: string) => void;
  onEditPatient?: (id: string) => void;
  loading?: boolean;
  totalCount?: number;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  label?: string;
  placeholder?: string;
}

export function PrescriptionPatientSelectField({
  patients,
  selectedId,
  onSelect,
  onEditPatient,
  loading = false,
  totalCount,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  label = 'Patient',
  placeholder = 'Choisir un patient…',
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PrescriptionPatientSelectField');
  const [open, setOpen] = useState(false);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedId),
    [patients, selectedId],
  );

  const displayLabel = selectedPatient ? patientDisplayName(selectedPatient) : placeholder;

  const openSheet = useCallback(() => {
    if (!loading) setOpen(true);
  }, [loading]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={openSheet}
        disabled={loading}
        style={[styles.trigger, loading && styles.triggerDisabled]}
        accessibilityRole="button"
        accessibilityLabel={
          selectedPatient
            ? `${label}, ${patientDisplayName(selectedPatient)}`
            : `${label}, ${placeholder}`
        }
      >
        <Cluster
          style={styles.triggerInner}
          actions={
            loading ? (
              <ActivityIndicator size="small" color={c.primary} />
            ) : (
              <View style={styles.actions}>
                {selectedPatient && onEditPatient ? (
                  <Pressable
                    onPress={() => onEditPatient(selectedPatient.id)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Modifier la fiche patient"
                  >
                    <PenLine size={18} color={c.primary} strokeWidth={2} />
                  </Pressable>
                ) : null}
                {selectedPatient ? (
                  <Pressable
                    onPress={() => onSelect('')}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Effacer le patient sélectionné"
                  >
                    <X size={18} color={c.textTertiary} strokeWidth={2} />
                  </Pressable>
                ) : (
                  <ChevronDown size={18} color={c.textSecondary} strokeWidth={2} />
                )}
              </View>
            )
          }
        >
          <Text
            style={[styles.triggerText, !selectedPatient && styles.placeholder]}
            numberOfLines={1}
          >
            {displayLabel}
          </Text>
        </Cluster>
      </Pressable>

      <PrescriptionPatientSelectSheet
        visible={open}
        onClose={() => setOpen(false)}
        patients={patients}
        selectedId={selectedId}
        onSelect={onSelect}
        loading={loading}
        totalCount={totalCount}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={onLoadMore}
        searchPlaceholder="Rechercher un patient…"
      />
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    wrap: {
      gap: spacing[1],
      alignSelf: 'stretch' as const,
    },
    label: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      marginBottom: spacing[0.5],
    },
    trigger: {
      borderWidth: 1,
      borderColor: c.borderLight,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      minHeight: 48,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2.5],
    },
    triggerDisabled: { opacity: 0.7 },
    triggerInner: { minWidth: 0, flex: 1 },
    triggerText: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontFamily.regular,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    placeholder: { color: c.textTertiary },
    actions: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[2],
    },
  };
}

import { layoutRowCenter } from '@/theme/layout-styles';
import type { AppColors } from '@/theme/colors';
import { useAppColors } from '@/theme/use-app-colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Cluster, Row } from '@/components/layout/primitives';
import { ChevronDown, PenLine, UserPlus, X } from 'lucide-react-native';
import {
  CreatePatientModal,
  type CreatedPatientResult,
} from '@/features/patients/components/CreatePatientModal';
import type { PatientRow } from '@/features/patients/api/fetch-all-patients';
import { PrescriptionPatientSelectSheet } from './PrescriptionPatientSelectSheet';
import { patientDisplayName } from '@/features/patients/utils/patient-contact-display';
import { queryKeys } from '@/lib/query-keys';
import { radius, spacing, iconSize, AppText } from '@/theme';
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

function createdResultToRow(patient: CreatedPatientResult): PatientRow {
  return {
    id: patient.id,
    first_name: patient.first_name,
    last_name: patient.last_name,
    phone: patient.phone,
    email: patient.email,
  };
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
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [pinnedPatient, setPinnedPatient] = useState<PatientRow | null>(null);

  const patientOptions = useMemo(() => {
    if (!pinnedPatient) return patients;
    if (patients.some((p) => p.id === pinnedPatient.id)) return patients;
    return [pinnedPatient, ...patients];
  }, [patients, pinnedPatient]);

  const selectedPatient = useMemo(
    () => patientOptions.find((p) => p.id === selectedId),
    [patientOptions, selectedId],
  );

  const displayLabel = selectedPatient ? patientDisplayName(selectedPatient) : placeholder;

  const openSheet = useCallback(() => {
    if (!loading) setOpen(true);
  }, [loading]);

  const refreshPatients = useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['prescriptions', 'patients', 'infinite'] }),
      qc.invalidateQueries({ queryKey: queryKeys.patients.all }),
    ]);
  }, [qc]);

  const adoptPatient = useCallback(
    async (row: PatientRow) => {
      setPinnedPatient(row);
      onSelect(row.id);
      setOpen(false);
      setCreateOpen(false);
      await refreshPatients();
    },
    [onSelect, refreshPatients],
  );

  const handleCreated = useCallback(
    (patient: CreatedPatientResult) => {
      void adoptPatient(createdResultToRow(patient));
    },
    [adoptPatient],
  );

  const handleExistingPatient = useCallback(
    (row: PatientRow) => {
      void adoptPatient(row);
    },
    [adoptPatient],
  );

  return (
    <View style={styles.wrap}>
      <AppText style={styles.label}>{label}</AppText>
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
                    <PenLine size={iconSize.mdSm} color={c.primary} strokeWidth={2} />
                  </Pressable>
                ) : null}
                {selectedPatient ? (
                  <Pressable
                    onPress={() => onSelect('')}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Effacer le patient sélectionné"
                  >
                    <X size={iconSize.mdSm} color={c.textTertiary} strokeWidth={2} />
                  </Pressable>
                ) : (
                  <ChevronDown size={iconSize.mdSm} color={c.textSecondary} strokeWidth={2} />
                )}
              </View>
            )
          }
        >
          <AppText
            style={[styles.triggerText, !selectedPatient && styles.placeholder]}
            numberOfLines={1}
          >
            {displayLabel}
          </AppText>
        </Cluster>
      </Pressable>

      <Pressable
        onPress={() => setCreateOpen(true)}
        style={styles.addPatientBtn}
        accessibilityRole="button"
        accessibilityLabel="Ajouter un patient"
      >
        <Row gap={spacing[2]} align="center" justify="center">
          <UserPlus size={iconSize.mdSm} color={c.primary} strokeWidth={2.25} />
          <AppText style={styles.addPatientText}>Ajouter un patient</AppText>
        </Row>
      </Pressable>

      <PrescriptionPatientSelectSheet
        visible={open}
        onClose={() => setOpen(false)}
        patients={patientOptions}
        selectedId={selectedId}
        onSelect={onSelect}
        loading={loading}
        totalCount={totalCount}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={onLoadMore}
        searchPlaceholder="Rechercher un patient…"
      />

      <CreatePatientModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        stackBehavior="push"
        onCreated={handleCreated}
        onExistingPatient={handleExistingPatient}
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
      ...layoutRowCenter(spacing[2]),
    },
    addPatientBtn: {
      borderWidth: 1,
      borderColor: c.primaryMid,
      borderRadius: radius.lg,
      backgroundColor: c.primaryLight,
      paddingVertical: spacing[2.5],
      paddingHorizontal: spacing[3],
    },
    addPatientText: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.primary,
    },
  };
}

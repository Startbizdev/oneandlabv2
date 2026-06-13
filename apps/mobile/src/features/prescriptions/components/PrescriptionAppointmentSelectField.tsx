import type { AppColors } from '@/theme/colors';
import { useAppColors } from '@/theme/use-app-colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { ChevronDown, X } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { PrescriptionAppointmentSelectSheet } from './PrescriptionAppointmentSelectSheet';
import { prescriptionAppointmentSelectSummary } from '../utils/prescription-display';
import { groupAppointmentsByBatch } from '@/utils/appointment-batch';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  appointments: Appointment[];
  selectedId: string;
  onSelect: (id: string) => void;
  loading?: boolean;
  totalCount?: number;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  label?: string;
  placeholder?: string;
}

/** Sélecteur RDV — ouvre un sheet avec recherche intégrée. */
export function PrescriptionAppointmentSelectField({
  appointments,
  selectedId,
  onSelect,
  loading = false,
  totalCount,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  label = 'Rendez-vous',
  placeholder = 'Choisir un rendez-vous…',
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PrescriptionAppointmentSelectField');
  const [open, setOpen] = useState(false);

  const sorted = useMemo(
    () =>
      [...appointments].sort(
        (a, b) =>
          new Date(b.scheduled_at ?? b.created_at ?? 0).getTime() -
          new Date(a.scheduled_at ?? a.created_at ?? 0).getTime(),
      ),
    [appointments],
  );

  const grouped = useMemo(() => groupAppointmentsByBatch(sorted), [sorted]);

  const selectedApt = useMemo(
    () => appointments.find((a) => a.id === selectedId) ?? sorted.find((a) => a.id === selectedId),
    [appointments, selectedId, sorted],
  );

  const displayLabel = selectedApt
    ? prescriptionAppointmentSelectSummary(selectedApt)
    : placeholder;

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
          selectedApt
            ? `${label}, ${prescriptionAppointmentSelectSummary(selectedApt)}`
            : `${label}, ${placeholder}`
        }
      >
        <Cluster
          style={styles.triggerInner}
          actions={
            loading ? (
              <ActivityIndicator size="small" color={c.primary} />
            ) : selectedApt ? (
              <Pressable
                onPress={() => onSelect('')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Effacer le rendez-vous sélectionné"
              >
                <X size={18} color={c.textTertiary} strokeWidth={2} />
              </Pressable>
            ) : (
              <ChevronDown size={18} color={c.textSecondary} strokeWidth={2} />
            )
          }
        >
          <Text
            style={[styles.triggerText, !selectedApt && styles.placeholder]}
            numberOfLines={2}
          >
            {displayLabel}
          </Text>
        </Cluster>
      </Pressable>

      <PrescriptionAppointmentSelectSheet
        visible={open}
        onClose={() => setOpen(false)}
        rows={grouped}
        selectedId={selectedId}
        onSelect={onSelect}
        loading={loading}
        totalCount={totalCount}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={onLoadMore}
        searchPlaceholder="Rechercher par date, créneau ou soin…"
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
  };
}

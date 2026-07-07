import { layoutRowBetween, layoutRowCenter } from '@/theme/layout-styles';
import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react-native';
import type { ClinicalVitalReading, ClinicalVitalType } from '@oneandlab/shared-types';
import { clinicalVitalUiConfig } from '@oneandlab/shared-types';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { SkeletonList } from '@/components/ui/skeletons';
import { Stack } from '@/components/layout/primitives';
import {
  clinicalVitalHistoryQueryKey,
  fetchClinicalVitalHistory,
} from '../api/clinical-vitals.service';
import {
  formatClinicalVitalCardValue,
  formatClinicalVitalHistoryDate,
  formatClinicalVitalRecorderName,
} from '../utils/clinical-vital-display';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize, lh } from '@/theme/typography';

type Props = {
  visible: boolean;
  patientId: string;
  vitalType: ClinicalVitalType | null;
  onClose: () => void;
  onAdd: (type: ClinicalVitalType) => void;
  onEdit: (reading: ClinicalVitalReading) => void;
};

export function ClinicalVitalHistorySheet({
  visible,
  patientId,
  vitalType,
  onClose,
  onAdd,
  onEdit,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const cfg = vitalType ? clinicalVitalUiConfig(vitalType) : null;

  const historyQ = useQuery({
    queryKey: clinicalVitalHistoryQueryKey(patientId, vitalType ?? 'heart_rate'),
    queryFn: () => fetchClinicalVitalHistory(patientId, vitalType!),
    enabled: visible && Boolean(patientId && vitalType),
  });

  const title = cfg ? `${cfg.emoji} ${cfg.label_fr}` : 'Historique';
  const unit = historyQ.data?.unit ?? cfg?.unit ?? '';

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle="Historique des mesures"
      snapPoints={['88%']}
      stackBehavior="switch"
      footer={
        vitalType ? (
          <Button title="Nouvelle mesure" onPress={() => onAdd(vitalType)} />
        ) : undefined
      }
    >
      {historyQ.isLoading ? (
        <SkeletonList count={5} itemHeight={72} gap={spacing[2]} />
      ) : historyQ.isError ? (
        <AppText style={[styles.empty, { color: c.error }]}>
          {historyQ.error instanceof Error ? historyQ.error.message : 'Erreur'}
        </AppText>
      ) : !historyQ.data?.history.length ? (
        <Stack gap={spacing[3]} style={styles.emptyWrap}>
          <AppText style={[styles.empty, { color: c.textSecondary }]}>
            Aucune mesure enregistrée pour cette constante.
          </AppText>
          {vitalType ? (
            <Button title="Ajouter une mesure" variant="secondary" onPress={() => onAdd(vitalType)} />
          ) : null}
        </Stack>
      ) : (
        <Stack gap={spacing[2]}>
          {historyQ.data.history.map((reading, index) => (
            <HistoryRow
              key={reading.id}
              reading={reading}
              unit={unit}
              isLatest={index === 0}
              onPress={() => onEdit(reading)}
              styles={styles}
              c={c}
            />
          ))}
        </Stack>
      )}
    </BottomSheet>
  );
}

function HistoryRow({
  reading,
  unit,
  isLatest,
  onPress,
  styles,
  c,
}: {
  reading: ClinicalVitalReading;
  unit: string;
  isLatest: boolean;
  onPress: () => void;
  styles: ReturnType<typeof buildStyles>;
  c: AppColors;
}) {
  const value = formatClinicalVitalCardValue(reading);
  const recorder = formatClinicalVitalRecorderName(reading);
  const dateLabel = formatClinicalVitalHistoryDate(reading.recorded_at);
  const note = reading.notes?.trim();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        {
          borderColor: isLatest ? c.primary + '55' : c.borderLight,
          backgroundColor: isLatest ? c.primaryLight + '14' : c.surface,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${value} ${unit}, ${dateLabel}, par ${recorder}`}
    >
      <View style={styles.rowMain}>
        <View style={styles.rowTop}>
          <AppText style={[styles.rowValue, { color: c.textPrimary }]}>
            {value}
            <AppText style={[styles.rowUnit, { color: c.textSecondary }]}> {unit}</AppText>
          </AppText>
          {isLatest ? (
            <View style={[styles.latestBadge, { backgroundColor: c.primaryLight }]}>
              <AppText style={[styles.latestBadgeText, { color: c.primary }]}>
                Dernière
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText style={[styles.rowMeta, { color: c.textSecondary }]} numberOfLines={1}>
          {dateLabel}
        </AppText>
        <AppText style={[styles.rowMeta, { color: c.textTertiary }]} numberOfLines={1}>
          Par {recorder}
        </AppText>
        {note ? (
          <AppText style={[styles.rowNote, { color: c.textSecondary }]} numberOfLines={2}>
            {note}
          </AppText>
        ) : null}
      </View>
      <ChevronRight size={iconSize.mdSm} color={c.textTertiary} strokeWidth={2} />
    </Pressable>
  );
}

function buildStyles(_c: AppColors) {
  return {
    emptyWrap: {
      paddingVertical: spacing[4],
    },
    empty: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      lineHeight: lh(fontSize.sm, 1.45),
      textAlign: 'center' as const,
    },
    row: {
      ...layoutRowCenter(spacing[2]),
      borderWidth: 1,
      borderRadius: radius.lg,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[3],
    },
    rowMain: {
      flex: 1,
      minWidth: 0,
      gap: spacing[0.5],
    },
    rowTop: {
      ...layoutRowBetween(spacing[2]),
    },
    rowValue: {
      minWidth: 0,
      fontFamily: fontFamily.bold,
      fontSize: fontSize.lg,
      flexShrink: 1,
    },
    rowUnit: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
    },
    latestBadge: {
      borderRadius: radius.md,
      paddingHorizontal: spacing[2],
      paddingVertical: 2,
    },
    latestBadgeText: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
    },
    rowMeta: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs, 1.35),
    },
    rowNote: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      lineHeight: lh(fontSize.sm, 1.4),
      marginTop: spacing[0.5],
    },
  };
}

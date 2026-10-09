import { Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react-native';
import type { ClinicalVitalReading, ClinicalVitalType } from '@oneandlab/shared-types';
import { clinicalVitalUiConfig } from '@oneandlab/shared-types';
import { SheetModal } from '@/components/ui/SheetModal';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListRowShell } from '@/components/ui/ListRowShell';
import { SkeletonList } from '@/components/ui/skeletons';
import { clinicalVitalHistoryQueryKey, fetchClinicalVitalHistory } from '../api/clinical-vitals.service';
import {
  formatClinicalVitalCardValue,
  formatClinicalVitalHistoryDate,
  formatClinicalVitalRecorderName,
} from '../utils/clinical-vital-display';
import {
  AppText,
  ICON_STROKE_WIDTH,
  font,
  iconSize,
  radius,
  spacing,
  useAppColors,
  useStyles,
  type Theme,
} from '@/theme';

type Props = {
  visible: boolean;
  patientId: string;
  vitalType: ClinicalVitalType | null;
  onClose: () => void;
  /** Absents en lecture seule : ni nouvelle mesure, ni modification. */
  onAdd?: (type: ClinicalVitalType) => void;
  onEdit?: (reading: ClinicalVitalReading) => void;
};

export function ClinicalVitalHistorySheet({ visible, patientId, vitalType, onClose, onAdd, onEdit }: Props) {
  const styles = useStyles(buildStyles);
  const cfg = vitalType ? clinicalVitalUiConfig(vitalType) : null;

  const historyQ = useQuery({
    queryKey: clinicalVitalHistoryQueryKey(patientId, vitalType ?? 'heart_rate'),
    queryFn: () => {
      if (!vitalType) throw new Error('Constante introuvable');
      return fetchClinicalVitalHistory(patientId, vitalType);
    },
    enabled: visible && Boolean(patientId && vitalType),
  });

  const unit = historyQ.data?.unit ?? cfg?.unit ?? '';
  const history = historyQ.data?.history ?? [];

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title={cfg ? `${cfg.emoji} ${cfg.label_fr}` : 'Historique'}
      subtitle={unit ? `Dernières mesures, en ${unit}` : 'Dernières mesures'}
      snapPoints={['88%']}
      footer={
        vitalType && onAdd ? (
          <Button title="Nouvelle mesure" size="lg" fullWidth onPress={() => onAdd(vitalType)} />
        ) : undefined
      }
    >
      {historyQ.isLoading ? (
        <SkeletonList count={5} itemHeight={64} gap={spacing[2]} />
      ) : historyQ.isError ? (
        <ErrorState
          title="Historique indisponible"
          error={historyQ.error}
          onRetry={() => void historyQ.refetch()}
        />
      ) : history.length === 0 ? (
        <AppText variant="secondary" style={styles.empty}>
          Aucune mesure pour l’instant.
        </AppText>
      ) : (
        <View style={styles.card}>
          {history.map((reading, index) => (
            <View key={reading.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <HistoryRow reading={reading} unit={unit} onPress={onEdit ? () => onEdit(reading) : undefined} />
            </View>
          ))}
        </View>
      )}
    </SheetModal>
  );
}

function HistoryRow({
  reading,
  unit,
  onPress,
}: {
  reading: ClinicalVitalReading;
  unit: string;
  onPress?: () => void;
}) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const value = `${formatClinicalVitalCardValue(reading)} ${unit}`.trim();
  const meta = `${formatClinicalVitalHistoryDate(reading.recorded_at)} · ${formatClinicalVitalRecorderName(reading)}`;
  const note = reading.notes?.trim();
  const label = `${value}, ${meta}${note ? `, ${note}` : ''}`;
  const row = (
    <ListRowShell
      body={
        <View style={styles.texts}>
          <AppText style={styles.value}>{value}</AppText>
          <AppText variant="caption" style={styles.meta}>
            {meta}
          </AppText>
          {note ? <AppText variant="secondary">{note}</AppText> : null}
        </View>
      }
      trailing={
        onPress ? <ChevronRight size={iconSize.sm} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} /> : undefined
      }
    />
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label}>
        {row}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Modifier cette mesure"
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      {row}
    </Pressable>
  );
}

function buildStyles({ colors: c, text }: Theme) {
  return {
    empty: { textAlign: 'center' as const, paddingVertical: spacing[6] },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      overflow: 'hidden' as const,
    },
    divider: { height: StyleSheet.hairlineWidth, marginLeft: spacing[4], backgroundColor: c.borderLight },
    pressed: { backgroundColor: c.surfaceAlt },
    texts: { gap: spacing[0.5] },
    value: { ...text.headline, ...font.semiBold, color: c.textPrimary },
    meta: { color: c.textSecondary },
  };
}

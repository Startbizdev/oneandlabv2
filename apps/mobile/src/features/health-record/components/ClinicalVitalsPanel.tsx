import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Plus } from 'lucide-react-native';
import type {
  ClinicalVitalContext,
  ClinicalVitalReading,
  ClinicalVitalType,
} from '@oneandlab/shared-types';
import { CLINICAL_VITAL_UI } from '@oneandlab/shared-types';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListRowShell } from '@/components/ui/ListRowShell';
import { SkeletonList } from '@/components/ui/skeletons';
import { clinicalVitalsQueryKey, fetchClinicalVitals } from '../api/clinical-vitals.service';
import { formatClinicalVitalCardDate, formatClinicalVitalCardValue } from '../utils/clinical-vital-display';
import { clinicalVitalIcon } from '../utils/clinical-vital-icon';
import { ClinicalVitalEditSheet } from './ClinicalVitalEditSheet';
import { ClinicalVitalHistorySheet } from './ClinicalVitalHistorySheet';
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
  patientId: string;
  context?: ClinicalVitalContext;
};

type VitalConfig = (typeof CLINICAL_VITAL_UI)[number];

function VitalRow({
  cfg,
  reading,
  onPress,
}: {
  cfg: VitalConfig;
  reading?: ClinicalVitalReading;
  onPress: () => void;
}) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const value = reading ? `${formatClinicalVitalCardValue(reading)} ${cfg.unit}`.trim() : null;
  const date = reading ? formatClinicalVitalCardDate(reading.recorded_at) : null;
  const Icon = clinicalVitalIcon(cfg.type);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${cfg.label_fr}, ${value}, ${date}` : `${cfg.label_fr}, non mesuré`}
      accessibilityHint={reading ? 'Voir l’historique' : 'Ajouter une mesure'}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      <ListRowShell
        leading={
          <View style={styles.iconWell} accessibilityElementsHidden importantForAccessibility="no">
            <Icon size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
        }
        body={
          <View style={styles.texts}>
            <AppText style={styles.label}>{cfg.card_label_fr}</AppText>
            {date ? (
              <AppText variant="caption" style={styles.date}>
                {date}
              </AppText>
            ) : null}
          </View>
        }
        trailing={
          <View style={styles.trailing}>
            {value ? (
              <AppText style={styles.value}>{value}</AppText>
            ) : (
              <AppText variant="secondary">Ajouter</AppText>
            )}
            <ChevronRight size={iconSize.sm} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
        }
      />
    </Pressable>
  );
}

export function ClinicalVitalsPanel({ patientId, context }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyType, setHistoryType] = useState<ClinicalVitalType | null>(null);
  const [editReading, setEditReading] = useState<ClinicalVitalReading | null>(null);
  const [addType, setAddType] = useState<ClinicalVitalType | null>(null);

  const vitalsQ = useQuery({
    queryKey: clinicalVitalsQueryKey(patientId),
    queryFn: () => fetchClinicalVitals(patientId),
    enabled: Boolean(patientId),
  });

  const latest = vitalsQ.data?.latest_by_type ?? {};

  const openAdd = (type?: ClinicalVitalType) => {
    setEditReading(null);
    setAddType(type ?? null);
    setSheetOpen(true);
  };

  const openHistory = (type: ClinicalVitalType) => {
    setHistoryType(type);
    setHistoryOpen(true);
  };

  const openEdit = (reading: ClinicalVitalReading) => {
    setEditReading(reading);
    setAddType(null);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setEditReading(null);
    setAddType(null);
  };

  const closeHistory = () => {
    setHistoryOpen(false);
    setHistoryType(null);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <AppText variant="headline" style={styles.title} accessibilityRole="header">
          Constantes
        </AppText>
        <Button
          title="Ajouter"
          variant="secondary"
          size="sm"
          leftIcon={<Plus size={iconSize.sm} color={c.primaryDark} strokeWidth={ICON_STROKE_WIDTH} />}
          onPress={() => openAdd()}
          accessibilityLabel="Ajouter une constante"
        />
      </View>

      {vitalsQ.isLoading && !vitalsQ.data ? (
        <SkeletonList count={4} itemHeight={56} gap={8} />
      ) : vitalsQ.isError && !vitalsQ.data ? (
        <ErrorState
          error={vitalsQ.error}
          title="Constantes indisponibles"
          onRetry={() => void vitalsQ.refetch()}
        />
      ) : (
        <View style={styles.card}>
          {CLINICAL_VITAL_UI.map((cfg, index) => {
            const reading = latest[cfg.type];
            return (
              <View key={cfg.type}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <VitalRow
                  cfg={cfg}
                  reading={reading}
                  onPress={() => (reading ? openHistory(cfg.type) : openAdd(cfg.type))}
                />
              </View>
            );
          })}
        </View>
      )}

      <ClinicalVitalHistorySheet
        visible={historyOpen}
        patientId={patientId}
        vitalType={historyType}
        onClose={closeHistory}
        onAdd={openAdd}
        onEdit={openEdit}
      />

      <ClinicalVitalEditSheet
        visible={sheetOpen}
        patientId={patientId}
        reading={editReading}
        initialType={addType}
        context={context}
        onClose={closeSheet}
      />
    </View>
  );
}

const ICON_WELL = 36;

function buildStyles({ colors: c, text }: Theme) {
  return {
    wrap: { gap: spacing[3] },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      flexWrap: 'wrap' as const,
      gap: spacing[2],
    },
    title: { flexShrink: 1, minWidth: 0 },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      overflow: 'hidden' as const,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: spacing[4] + ICON_WELL + spacing[3],
      backgroundColor: c.borderLight,
    },
    pressed: { backgroundColor: c.surfaceAlt },
    iconWell: {
      width: ICON_WELL,
      height: ICON_WELL,
      borderRadius: radius.md,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    texts: { gap: spacing[0.5] },
    label: { ...text.body, ...font.medium, color: c.textPrimary },
    date: { color: c.textSecondary },
    trailing: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[1],
      flexShrink: 1,
    },
    value: { ...text.body, ...font.semiBold, color: c.textPrimary, textAlign: 'right' as const },
  };
}

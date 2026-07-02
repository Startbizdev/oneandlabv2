import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react-native';
import type {
  ClinicalVitalContext,
  ClinicalVitalReading,
  ClinicalVitalType,
} from '@oneandlab/shared-types';
import { CLINICAL_VITAL_UI } from '@oneandlab/shared-types';
import {
  clinicalVitalsQueryKey,
  fetchClinicalVitals,
} from '../api/clinical-vitals.service';
import {
  formatClinicalVitalCardDate,
  formatClinicalVitalCardValue,
} from '../utils/clinical-vital-display';
import { ClinicalVitalEditSheet } from './ClinicalVitalEditSheet';
import { ClinicalVitalHistorySheet } from './ClinicalVitalHistorySheet';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const CARD_MIN_H = 96;
/** 1 carte « Ajouter » + une carte par type de constante. */
const VITAL_GRID_CARD_COUNT = 1 + CLINICAL_VITAL_UI.length;

/** 3 colonnes sur petits écrans pour éviter les retours à la ligne sur les libellés. */
function gridColumns(screenWidth: number): number {
  if (screenWidth < 360) return 3;
  return 4;
}

type Props = {
  patientId: string;
  context?: ClinicalVitalContext;
};

function VitalCardContent({
  cfg,
  reading,
  styles,
  c,
}: {
  cfg: (typeof CLINICAL_VITAL_UI)[number];
  reading?: ClinicalVitalReading;
  styles: ReturnType<typeof buildStyles>;
  c: AppColors;
}) {
  return (
    <View style={styles.cardBody}>
      <View style={[styles.emojiBadge, { backgroundColor: c.surfaceAlt ?? c.primaryLight + '40' }]}>
        <Text style={styles.emoji}>{cfg.emoji}</Text>
      </View>
      <Text
        style={styles.cardLabel}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.82}
      >
        {cfg.card_label_fr}
      </Text>
      <View style={styles.cardMetrics}>
        {reading ? (
          <>
            <View style={styles.valueRow}>
              <Text style={styles.cardValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {formatClinicalVitalCardValue(reading)}
              </Text>
              <Text style={styles.cardUnit}>{cfg.unit}</Text>
            </View>
            <Text style={styles.cardDate} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {formatClinicalVitalCardDate(reading.recorded_at)}
            </Text>
          </>
        ) : (
          <Text style={styles.cardPlaceholder}>—</Text>
        )}
      </View>
    </View>
  );
}

export function ClinicalVitalsPanel({ patientId, context }: Props) {
  const c = useAppColors();
  const { width: screenWidth } = useWindowDimensions();
  const cols = gridColumns(screenWidth);
  const styles = useThemedStyles(buildStyles);
  const slotStyle = { width: `${100 / cols}%` as const };

  const [sheetOpen, setSheetOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyType, setHistoryType] = useState<ClinicalVitalType | null>(null);
  const [editReading, setEditReading] = useState<ClinicalVitalReading | null>(null);
  const [addType, setAddType] = useState<ClinicalVitalType | null>(null);
  const [editStackPush, setEditStackPush] = useState(false);

  const vitalsQ = useQuery({
    queryKey: clinicalVitalsQueryKey(patientId),
    queryFn: () => fetchClinicalVitals(patientId),
    enabled: Boolean(patientId),
  });

  const latest = vitalsQ.data?.latest_by_type ?? {};

  const openAdd = (type?: ClinicalVitalType, fromHistory = false) => {
    setEditReading(null);
    setAddType(type ?? null);
    setEditStackPush(fromHistory);
    setSheetOpen(true);
  };

  const openHistory = (type: ClinicalVitalType) => {
    setHistoryType(type);
    setHistoryOpen(true);
  };

  const openEdit = (reading: ClinicalVitalReading, fromHistory = false) => {
    setEditReading(reading);
    setAddType(null);
    setEditStackPush(fromHistory);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setEditReading(null);
    setAddType(null);
    setEditStackPush(false);
  };

  const closeHistory = () => {
    setHistoryOpen(false);
    setHistoryType(null);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Constantes médicales</Text>

      {vitalsQ.isLoading && !vitalsQ.data ? (
        <View style={styles.grid}>
          {Array.from({ length: VITAL_GRID_CARD_COUNT }).map((_, i) => (
            <View key={i} style={[styles.cardSlot, slotStyle]}>
              <View style={styles.skeletonCard} />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.grid}>
          <View style={[styles.cardSlot, slotStyle]}>
            <Pressable
              style={[styles.card, styles.addCard, elevation.sm]}
              onPress={() => openAdd()}
              accessibilityRole="button"
              accessibilityLabel="Ajouter une constante"
            >
              <View style={[styles.addIconCircle, { backgroundColor: c.primaryLight }]}>
                <Plus size={18} color={c.primary} strokeWidth={2.25} />
              </View>
              <Text style={styles.addLabel}>Ajouter</Text>
            </Pressable>
          </View>

          {CLINICAL_VITAL_UI.map((cfg) => {
            const reading = latest[cfg.type];
            return (
              <View key={cfg.type} style={[styles.cardSlot, slotStyle]}>
                <Pressable
                  style={[styles.card, elevation.sm, reading ? styles.cardFilled : styles.cardEmpty]}
                  onPress={() => (reading ? openHistory(cfg.type) : openAdd(cfg.type))}
                  accessibilityRole="button"
                  accessibilityLabel={cfg.label_fr}
                >
                  <VitalCardContent cfg={cfg} reading={reading} styles={styles} c={c} />
                </Pressable>
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
        onAdd={(type) => openAdd(type, true)}
        onEdit={(reading) => openEdit(reading, true)}
      />

      <ClinicalVitalEditSheet
        visible={sheetOpen}
        patientId={patientId}
        reading={editReading}
        initialType={addType}
        context={context}
        stackBehavior={editStackPush ? 'push' : 'switch'}
        onClose={closeSheet}
      />
    </View>
  );
}

function buildStyles(c: AppColors) {
  const gap = spacing[2];
  return {
    wrap: { gap: spacing[2] },
    title: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.4,
    },
    grid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      marginHorizontal: -(gap / 2),
    },
    cardSlot: {
      paddingHorizontal: gap / 2,
      paddingBottom: gap,
    },
    skeletonCard: {
      minHeight: CARD_MIN_H,
      borderRadius: radius.lg,
      backgroundColor: c.borderLight,
      opacity: 0.5,
    },
    card: {
      minHeight: CARD_MIN_H,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
      backgroundColor: c.surface,
      padding: spacing[2],
      overflow: 'hidden' as const,
    },
    cardBody: {
      flex: 1,
      minHeight: CARD_MIN_H - spacing[2] * 2,
      gap: spacing[1],
    },
    cardFilled: {
      borderColor: c.primary + '45',
      backgroundColor: c.primaryLight ? c.primaryLight + '18' : c.surface,
    },
    cardEmpty: {
      opacity: 0.92,
    },
    addCard: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderStyle: 'dashed' as const,
      gap: spacing[1.5] ?? 6,
    },
    addIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    addLabel: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      color: c.primary,
    },
    emojiBadge: {
      width: 32,
      height: 32,
      borderRadius: radius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    emoji: {
      fontSize: 18,
      lineHeight: 22,
      textAlign: 'center' as const,
    },
    cardLabel: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      color: c.textSecondary,
      lineHeight: fontSize.xs * 1.2,
    },
    cardMetrics: {
      flex: 1,
      justifyContent: 'flex-end' as const,
      gap: 1,
    },
    valueRow: {
      flexDirection: 'row' as const,
      alignItems: 'baseline' as const,
      flexWrap: 'wrap' as const,
      gap: 3,
    },
    cardValue: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.md,
      color: c.textPrimary,
      flexShrink: 1,
    },
    cardUnit: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      color: c.textSecondary,
    },
    cardDate: {
      fontFamily: fontFamily.regular,
      fontSize: 10,
      color: c.textTertiary,
      lineHeight: 12,
    },
    cardPlaceholder: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.md,
      color: c.textTertiary,
      lineHeight: fontSize.md,
    },
  };
}

import type { AppColors } from '@/theme/colors';
import { hexToRgba } from '@/theme/color-utils';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, Text, View } from 'react-native';
import { Stack } from '@/components/layout/primitives';
import { Input } from '@/components/ui/Input';
import type { PassagePlanningFormState, PlanningMode } from '../utils/passage-planning';
import { IsoDatePicker } from './IsoDatePicker';
import { PassageMultiDateCalendar } from './PassageMultiDateCalendar';
import { PassageWeekdayChips } from './PassageWeekdayChips';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type Props = {
  state: PassagePlanningFormState;
  onChange: (patch: Partial<PassagePlanningFormState>) => void;
  passageCount?: number;
};

const MODE_OPTIONS: { id: PlanningMode; label: string; hint?: string }[] = [
  {
    id: 'single_day',
    label: 'Un seul jour',
    hint: 'Une date de fin étend le passage sur chaque jour de la période',
  },
  { id: 'interval', label: 'Par intervalle régulier' },
  { id: 'weekdays', label: 'Par jour de la semaine' },
  { id: 'custom_dates', label: 'Par dates personnalisées' },
  { id: 'manual', label: 'Aucune — ajout manuel' },
];

export function PassagePlanningSection({ state, onChange, passageCount }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);

  const setMode = (mode: PlanningMode) => onChange({ planningMode: mode });
  const isCustomDates = state.planningMode === 'custom_dates';
  const isManual = state.planningMode === 'manual';

  return (
    <View>
      {!isCustomDates ? (
        <View
          style={[styles.periodCard, { borderColor: c.borderLight, backgroundColor: c.surfaceAlt }]}
        >
          <Text style={[styles.periodTitle, { color: c.textSecondary }]}>Période</Text>
          {isManual ? (
            <IsoDatePicker
              label="Date du premier passage"
              value={state.startDate}
              onChange={(startDate) => onChange({ startDate })}
            />
          ) : (
            <Stack gap={spacing[2]}>
              <IsoDatePicker
                label="Date de début"
                value={state.startDate}
                onChange={(startDate) => onChange({ startDate })}
              />
              <IsoDatePicker
                label="Date de fin"
                value={state.endDate}
                onChange={(endDate) => onChange({ endDate })}
                placeholder="Optionnelle"
              />
            </Stack>
          )}
        </View>
      ) : null}

      <Text style={[styles.sectionLabel, { color: c.textTertiary }]}>Type de planification</Text>

      {MODE_OPTIONS.map(({ id, label, hint }) => (
        <Pressable
          key={id}
          onPress={() => setMode(id)}
          style={[
            styles.planOption,
            {
              borderColor: state.planningMode === id ? c.primary : c.borderLight,
              backgroundColor:
                state.planningMode === id ? hexToRgba(c.primary, 0.06) : c.surface,
            },
          ]}
        >
          <Text style={{ fontFamily: fontFamily.semiBold, color: c.textPrimary }}>{label}</Text>
          {hint && state.planningMode === id ? (
            <Text style={[styles.optionHint, { color: c.textSecondary }]}>{hint}</Text>
          ) : null}
        </Pressable>
      ))}

      {state.planningMode === 'interval' ? (
        <Stack gap={spacing[2]} style={styles.planFields}>
          <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Tous les (jours)</Text>
          <Input
            value={state.everyDays}
            onChangeText={(everyDays) => onChange({ everyDays })}
            keyboardType="number-pad"
          />
        </Stack>
      ) : null}

      {state.planningMode === 'weekdays' ? (
        <Stack gap={spacing[2]} style={styles.planFields}>
          <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Jours de la semaine</Text>
          <PassageWeekdayChips
            selected={state.weekdays}
            onChange={(weekdays) => onChange({ weekdays })}
          />
        </Stack>
      ) : null}

      {state.planningMode === 'custom_dates' ? (
        <View style={styles.planFields}>
          <Text style={[styles.fieldLabel, { color: c.textSecondary, marginBottom: spacing[2] }]}>
            Sélectionnez les dates de passage
          </Text>
          <PassageMultiDateCalendar
            selected={state.customDates}
            onChange={(customDates) => onChange({ customDates })}
          />
        </View>
      ) : null}

      {state.planningMode === 'manual' ? (
        <Text style={[styles.manualHint, { color: c.textSecondary }]}>
          Aucune génération automatique au-delà du premier passage. Ajoutez les suivants depuis le
          détail.
        </Text>
      ) : null}

      {passageCount != null && passageCount > 0 ? (
        <View
          style={[styles.preview, { backgroundColor: hexToRgba(c.primary, 0.08), borderColor: c.primary }]}
        >
          <Text style={[styles.previewText, { color: c.primaryDark }]}>
            {passageCount === 1
              ? '1 passage sera créé'
              : `${passageCount} passages seront créés sur la période`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function buildStyles(_c: AppColors) {
  return {
    periodCard: {
      borderWidth: 1,
      borderRadius: radius.lg,
      padding: spacing[3],
      gap: spacing[2],
      marginBottom: spacing[3],
    },
    periodTitle: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.4,
    },
    sectionLabel: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
      marginBottom: spacing[2],
    },
    planOption: {
      borderWidth: 1,
      borderRadius: radius.lg,
      padding: spacing[3],
      marginBottom: spacing[2],
      gap: spacing[1],
    },
    optionHint: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      lineHeight: fontSize.xs * 1.4,
    },
    planFields: { marginTop: spacing[1], marginBottom: spacing[2] },
    fieldLabel: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      marginBottom: spacing[2],
    },
    manualHint: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      lineHeight: 20,
      marginTop: spacing[1],
    },
    preview: {
      marginTop: spacing[3],
      borderWidth: 1,
      borderRadius: radius.lg,
      padding: spacing[3],
    },
    previewText: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      textAlign: 'center' as const,
    },
  };
}

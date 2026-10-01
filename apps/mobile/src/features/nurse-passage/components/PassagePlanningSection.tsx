import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { hexToRgba } from '@/theme/color-utils';
import { useAppColors } from '@/theme/use-app-colors';
import { Stack } from '@/components/layout/primitives';
import { Input } from '@/components/ui/Input';
import type { PassagePlanningFormState, PlanningMode } from '../utils/passage-planning';
import { IsoDatePicker } from './IsoDatePicker';
import { PassageMultiDateCalendar } from './PassageMultiDateCalendar';
import { PassageWeekdayChips } from './PassageWeekdayChips';
import { ICON_STROKE_WIDTH, MIN_TOUCH_TARGET, iconSize, radius, spacing, AppText, useStyles, type Theme } from '@/theme';

type Props = {
  state: PassagePlanningFormState;
  onChange: (patch: Partial<PassagePlanningFormState>) => void;
  passageCount?: number;
};

const MODE_OPTIONS: { id: PlanningMode; label: string; hint?: string }[] = [
  {
    id: 'single_day',
    label: 'Un seul jour',
    hint: 'Une date de fin étend le passage sur chaque jour de la période.',
  },
  { id: 'interval', label: 'Intervalle régulier' },
  { id: 'weekdays', label: 'Jours de la semaine' },
  { id: 'custom_dates', label: 'Dates personnalisées' },
  { id: 'manual', label: 'Ajout manuel' },
];

type OptionProps = {
  label: string;
  hint?: string;
  selected: boolean;
  role: 'radio' | 'checkbox';
  onPress: () => void;
};

function PlanningOption({ label, hint, selected, role, onPress }: OptionProps) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { selected } : { checked: selected }}
      style={[styles.option, selected ? styles.optionSelected : null]}
    >
      <View style={styles.optionText}>
        <AppText variant="body" style={styles.optionLabel}>
          {label}
        </AppText>
        {hint ? (
          <AppText variant="caption">
            {hint}
          </AppText>
        ) : null}
      </View>
      {selected ? <Check size={iconSize.md} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} /> : null}
    </Pressable>
  );
}

export function PassagePlanningSection({ state, onChange, passageCount }: Props) {
  const styles = useStyles(buildStyles);

  const isCustomDates = state.planningMode === 'custom_dates';
  const isManual = state.planningMode === 'manual';
  const isRecurring = state.planningMode === 'interval' || state.planningMode === 'weekdays';

  return (
    <View style={styles.root}>
      {!isCustomDates ? (
        <Stack gap={spacing[2]}>
          <AppText variant="headline">Période</AppText>
          {isManual ? (
            <IsoDatePicker
              label="Date du premier passage"
              value={state.startDate}
              onChange={(startDate) => onChange({ startDate })}
            />
          ) : (
            <>
              <IsoDatePicker
                label="Date de début"
                value={state.startDate}
                onChange={(startDate) => onChange({ startDate })}
              />
              <IsoDatePicker
                label="Date de fin"
                value={state.endDate}
                onChange={(endDate) => onChange({ endDate, openEnded: false })}
                placeholder="Optionnelle"
                disabled={state.openEnded && isRecurring}
              />
              {isRecurring ? (
                <PlanningOption
                  role="checkbox"
                  label="Passage chronique, sans date de fin"
                  hint="Planifié sur 1 an, renouvelable ensuite."
                  selected={state.openEnded}
                  onPress={() =>
                    onChange({
                      openEnded: !state.openEnded,
                      ...(state.openEnded ? {} : { endDate: '' }),
                    })
                  }
                />
              ) : null}
            </>
          )}
        </Stack>
      ) : null}

      <View style={styles.group} accessibilityRole="radiogroup">
        <AppText variant="headline">Répétition</AppText>
        {MODE_OPTIONS.map(({ id, label, hint }) => (
          <PlanningOption
            key={id}
            role="radio"
            label={label}
            hint={state.planningMode === id ? hint : undefined}
            selected={state.planningMode === id}
            onPress={() => onChange({ planningMode: id })}
          />
        ))}
      </View>

      {state.planningMode === 'interval' ? (
        <Stack gap={spacing[2]}>
          <AppText variant="secondary">
            Tous les (jours)
          </AppText>
          <Input
            value={state.everyDays}
            onChangeText={(everyDays) => onChange({ everyDays })}
            keyboardType="number-pad"
          />
        </Stack>
      ) : null}

      {state.planningMode === 'weekdays' ? (
        <Stack gap={spacing[2]}>
          <AppText variant="secondary">
            Jours de la semaine
          </AppText>
          <PassageWeekdayChips selected={state.weekdays} onChange={(weekdays) => onChange({ weekdays })} />
        </Stack>
      ) : null}

      {isCustomDates ? (
        <Stack gap={spacing[2]}>
          <AppText variant="secondary">
            Sélectionnez les dates de passage
          </AppText>
          <PassageMultiDateCalendar
            selected={state.customDates}
            onChange={(customDates) => onChange({ customDates })}
          />
        </Stack>
      ) : null}

      {isManual ? (
        <AppText variant="secondary">
          Seul le premier passage est créé. Ajoutez les suivants depuis le détail.
        </AppText>
      ) : null}

      {passageCount != null && passageCount > 0 ? (
        <View style={styles.preview}>
          <AppText variant="secondary" style={styles.previewText}>
            {passageCount === 1 ? '1 passage sera créé' : `${passageCount} passages seront créés`}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

function buildStyles({ colors: c, font }: Theme) {
  return {
    root: { gap: spacing[5] },
    group: { gap: spacing[2] },
    option: {
      minHeight: MIN_TOUCH_TARGET,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[3],
      borderWidth: 1,
      borderColor: c.borderLight,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
    },
    optionSelected: {
      borderColor: c.primary,
      backgroundColor: hexToRgba(c.primary, 0.06),
    },
    optionText: { flex: 1, minWidth: 0, gap: spacing[0.5] },
    optionLabel: { ...font.semiBold },
    preview: {
      borderRadius: radius.lg,
      padding: spacing[3],
      backgroundColor: hexToRgba(c.primary, 0.08),
    },
    previewText: { ...font.semiBold, color: c.primaryDark, textAlign: 'center' as const },
  };
}

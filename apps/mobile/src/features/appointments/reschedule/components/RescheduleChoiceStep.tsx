import { View } from 'react-native';
import { CalendarPlus, RefreshCcw, type LucideIcon } from 'lucide-react-native';
import { ChoiceCard } from '@/components/ui/ChoiceCard';
import type { RescheduleChoiceMode } from '../utils/build-reschedule-payload';
import {
  AppText,
  ICON_STROKE_WIDTH,
  iconSize,
  radius,
  spacing,
  useAppColors,
  useStyles,
  type Theme,
} from '@/theme';

type ChoiceConfig = {
  mode: RescheduleChoiceMode;
  title: string;
  hint?: string;
  description: string;
  icon: LucideIcon;
};

const CHOICES: ChoiceConfig[] = [
  {
    mode: 'cancel_and_new',
    title: 'Remplacer le rendez-vous',
    hint: 'Le plus courant',
    description: 'L’ancien rendez-vous est annulé et remplacé par le nouveau.',
    icon: RefreshCcw,
  },
  {
    mode: 'create_only',
    title: 'Ajouter un nouveau rendez-vous',
    description: 'L’ancien rendez-vous est conservé.',
    icon: CalendarPlus,
  },
];

const REPLACE_UNAVAILABLE =
  'Indisponible : vous n’avez pas créé ce rendez-vous. Redispatchez-le ou partagez-le.';

interface Props {
  patientName: string;
  choiceMode: RescheduleChoiceMode | null;
  canReplace: boolean;
  onSelect: (mode: RescheduleChoiceMode) => void;
}

export function RescheduleChoiceStep({ patientName, choiceMode, canReplace, onSelect }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.root}>
      <AppText variant="title" accessibilityRole="header">
        Pour {patientName}
      </AppText>
      <View style={styles.choiceList} accessibilityRole="radiogroup">
        {CHOICES.map((choice) => {
          const selected = choiceMode === choice.mode;
          const disabledReason =
            choice.mode === 'cancel_and_new' && !canReplace ? REPLACE_UNAVAILABLE : null;
          const Icon = choice.icon;
          return (
            <ChoiceCard
              key={choice.mode}
              title={choice.title}
              description={disabledReason ?? choice.description}
              eyebrow={disabledReason ? undefined : choice.hint}
              selected={selected}
              disabled={disabledReason !== null}
              onPress={() => onSelect(choice.mode)}
              leading={
                <View style={[styles.iconWell, selected && styles.iconWellSelected]}>
                  <Icon
                    size={iconSize.md}
                    color={selected ? c.primaryDark : c.textSecondary}
                    strokeWidth={ICON_STROKE_WIDTH}
                  />
                </View>
              }
            />
          );
        })}
      </View>
    </View>
  );
}

const ICON_WELL = 40;

function buildStyles({ colors: c }: Theme) {
  return {
    root: { gap: spacing[4] },
    choiceList: { gap: spacing[3] },
    iconWell: {
      width: ICON_WELL,
      height: ICON_WELL,
      borderRadius: radius.md,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    iconWellSelected: { backgroundColor: c.primaryLight },
  };
}

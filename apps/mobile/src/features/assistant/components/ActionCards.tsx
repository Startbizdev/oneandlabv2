import type { MobileRole } from '@oneandlab/shared-constants';
import type { AssistantAction } from '@oneandlab/shared-types';
import { memo } from 'react';
import { Pressable, View } from 'react-native';
import {
  ArrowUpRight,
  CalendarDays,
  CalendarPlus,
  FileText,
  FlaskConical,
  HeartPulse,
  Route,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react-native';
import { AppText, ICON_STROKE_WIDTH, MIN_TOUCH_TARGET, font, iconSize, radius, spacing, useStyles, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { resolveAssistantAction, type AssistantActionTarget } from '../utils/assistant-actions';

const ICONS: Record<string, LucideIcon> = {
  book_appointment: CalendarPlus,
  open_appointment: CalendarDays,
  open_lab_results: FlaskConical,
  open_health_record: HeartPulse,
  open_tour: Route,
  create_transmission: FileText,
  enable_results_reading: ShieldCheck,
};

const FALLBACK_LABELS: Record<string, string> = {
  book_appointment: 'Prendre rendez-vous',
  open_appointment: 'Voir le rendez-vous',
  open_lab_results: 'Voir les résultats',
  open_health_record: 'Ouvrir le carnet de santé',
  open_tour: 'Voir la tournée',
  create_transmission: 'Créer la transmission',
  enable_results_reading: 'Autoriser la lecture de mes résultats',
};

type Props = {
  actions: AssistantAction[];
  role: MobileRole;
  patientId?: string;
  onAction: (target: AssistantActionTarget) => void;
};

/** Actions proposées sous une réponse, en boutons discrets : ouvrent un écran existant, l'utilisateur valide. */
export const ActionCards = memo(function ActionCards({ actions, role, patientId, onAction }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const cards = actions
    .filter((a) => a.type !== 'call_emergency')
    .map((action) => ({ action, target: resolveAssistantAction(role, action, patientId) }))
    .filter((card): card is { action: AssistantAction; target: AssistantActionTarget } => card.target !== null);
  if (cards.length === 0) return null;
  return (
    <View style={styles.list}>
      {cards.map(({ action, target }, index) => {
        const Icon = ICONS[action.type] ?? ArrowUpRight;
        const label = action.label || FALLBACK_LABELS[action.type] || 'Ouvrir';
        // La première action est la suite principale (pleine) ; les autres restent neutres et lisibles.
        const main = index === 0;
        return (
          <Pressable
            key={`${action.type}-${index}`}
            onPress={() => onAction(target)}
            style={({ pressed }) => [
              styles.chip,
              main ? styles.main : styles.secondary,
              pressed && (main ? styles.mainPressed : styles.secondaryPressed),
            ]}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <Icon size={iconSize.sm} color={main ? c.onPrimary : c.textPrimary} strokeWidth={ICON_STROKE_WIDTH} />
            <AppText variant="secondary" style={[styles.label, { color: main ? c.onPrimary : c.textPrimary }]}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
});

function buildStyles({ colors: c }: Theme) {
  return {
    list: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing[2] },
    chip: {
      minHeight: MIN_TOUCH_TARGET,
      maxWidth: '100%' as const,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[2],
      paddingHorizontal: spacing[4],
      borderRadius: radius.full,
      borderWidth: 1,
    },
    main: { backgroundColor: c.primary, borderColor: c.primary },
    mainPressed: { opacity: 0.85 },
    secondary: { backgroundColor: c.surface, borderColor: c.cardBorder },
    secondaryPressed: { backgroundColor: c.surfaceAlt },
    label: { ...font.semiBold, flexShrink: 1 },
  };
}

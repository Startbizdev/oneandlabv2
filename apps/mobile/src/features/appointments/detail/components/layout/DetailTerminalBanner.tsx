import { useAppColors } from '@/theme/use-app-colors';
import { StyleSheet, View } from 'react-native';
import { CalendarX, CircleCheck, Ban, TimerOff } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { AppointmentSidebarTerminalEmpty } from '@/utils/appointment-sidebar-terminal';
import { ICON_STROKE_WIDTH, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

const ICONS: Record<AppointmentSidebarTerminalEmpty['icon'], LucideIcon> = {
  'calendar-x': CalendarX,
  'circle-check': CircleCheck,
  ban: Ban,
  'timer-off': TimerOff,
};

/** État final du RDV (annulé, terminé…) : une ligne, l'absence d'actions se voit d'elle-même. */
export function DetailTerminalBanner({ terminal }: { terminal: AppointmentSidebarTerminalEmpty }) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const Icon = ICONS[terminal.icon];

  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <Icon size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
      <AppText style={styles.title}>{terminal.title}</AppText>
    </View>
  );
}

function buildStyles({ colors: c, text }: Theme) {
  return {
    wrap: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[3],
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      borderRadius: radius.lg,
      backgroundColor: c.surfaceAlt,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
    },
    title: {
      flex: 1,
      minWidth: 0,
      ...text.body,
      ...font.medium,
      color: c.textPrimary,
    },
  };
}

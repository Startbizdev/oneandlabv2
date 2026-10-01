import { useAppColors } from '@/theme/use-app-colors';
import { StyleSheet, View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { CalendarX, CircleCheck, Ban, TimerOff } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { AppointmentSidebarTerminalEmpty } from '@/utils/appointment-sidebar-terminal';
import { radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

const ICONS: Record<string, LucideIcon> = {
  'calendar-x': CalendarX,
  'circle-check': CircleCheck,
  ban: Ban,
  'timer-off': TimerOff,
};

export function DetailTerminalBanner({ terminal }: { terminal: AppointmentSidebarTerminalEmpty }) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  const Icon = ICONS[terminal.icon] ?? CircleCheck;
  return (
    <Cluster
      gap={spacing[2]}
      align="start"
      style={styles.wrap}
      leading={<Icon size={iconSize.sm} color={c.textTertiary} strokeWidth={2} />}
    >
      <AppText style={styles.text}>
        <AppText style={styles.title}>{terminal.title}</AppText>
        <AppText style={styles.desc}> · {terminal.description}</AppText>
      </AppText>
    </Cluster>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  wrap: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderRadius: radius.lg,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  text: {},
  title: {
    ...font.semiBold,
    fontSize: fontSize.xs,
    color: c.textPrimary,
  },
  desc: {
    ...font.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
};
}

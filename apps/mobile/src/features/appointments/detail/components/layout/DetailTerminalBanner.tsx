import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { StyleSheet, Text, View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { CalendarX, CircleCheck, Ban, TimerOff } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { AppointmentSidebarTerminalEmpty } from '@/utils/appointment-sidebar-terminal';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const ICONS: Record<string, LucideIcon> = {
  'calendar-x': CalendarX,
  'circle-check': CircleCheck,
  ban: Ban,
  'timer-off': TimerOff,
};

export function DetailTerminalBanner({ terminal }: { terminal: AppointmentSidebarTerminalEmpty }) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_layout_DetailTerminalBanner_tsx_DetailTerminalBanner_styles');

  const Icon = ICONS[terminal.icon] ?? CircleCheck;
  return (
    <Cluster
      gap={spacing[2]}
      align="start"
      style={styles.wrap}
      leading={<Icon size={16} color={c.textTertiary} strokeWidth={2} />}
    >
      <Text style={styles.text}>
        <Text style={styles.title}>{terminal.title}</Text>
        <Text style={styles.desc}> · {terminal.description}</Text>
      </Text>
    </Cluster>
  );
}

function buildStyles(c: AppColors) {
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
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textPrimary,
  },
  desc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
};
}

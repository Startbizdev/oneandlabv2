import { colors } from '@/theme';
import { StyleSheet, Text, View } from 'react-native';
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
  const Icon = ICONS[terminal.icon] ?? CircleCheck;
  return (
    <View style={styles.wrap}>
      <Icon size={16} color={colors.textTertiary} strokeWidth={2} />
      <Text style={styles.text}>
        <Text style={styles.title}>{terminal.title}</Text>
        <Text style={styles.desc}> · {terminal.description}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  text: { flex: 1 },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
  },
  desc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});

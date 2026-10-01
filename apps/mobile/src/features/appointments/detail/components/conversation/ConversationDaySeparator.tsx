import { View } from 'react-native';
import { appointmentDayFrance } from '@oneandlab/shared-utils';
import { appointmentDaySectionLabel } from '@/utils/appointment-list-sections';
import { AppText, radius, spacing, useStyles, font, type Theme } from '@/theme';

export type ConversationDayItem<T> =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'message'; key: string; message: T };

function dayKey(iso: string): string {
  return appointmentDayFrance(iso) || 'undated';
}

/** Insère un séparateur « Aujourd’hui / Hier / date » à chaque changement de jour. */
export function withConversationDaySeparators<T extends { created_at: string }>(
  messages: T[],
  messageKey: (message: T) => string,
): ConversationDayItem<T>[] {
  const items: ConversationDayItem<T>[] = [];
  let previous: string | null = null;
  for (const message of messages) {
    const key = dayKey(message.created_at);
    if (key !== previous) {
      items.push({ kind: 'day', key: `day:${key}`, label: appointmentDaySectionLabel(message.created_at) });
      previous = key;
    }
    items.push({ kind: 'message', key: messageKey(message), message });
  }
  return items;
}

export function ConversationDaySeparator({ label }: { label: string }) {
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.wrap} accessibilityRole="header">
      <AppText style={styles.label}>{label}</AppText>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    wrap: {
      alignSelf: 'center' as const,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
      borderRadius: radius.full,
      backgroundColor: c.surfaceAlt,
      marginVertical: spacing[1],
    },
    label: { ...font.medium, fontSize: fontSize.xs, color: c.textSecondary },
  };
}

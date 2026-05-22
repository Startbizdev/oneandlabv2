import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { Card } from '@/components/ui/Card';
import type { AppointmentHistoryEntry } from '../api/appointment-detail.service';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

dayjs.locale('fr');

const actionLabels: Record<string, string> = {
  created: 'Créé',
  accepted: 'Accepté',
  refused: 'Refusé',
  canceled: 'Annulé',
  completed: 'Terminé',
  offered: 'Proposé',
  updated: 'Modifié',
};

export function HistoryTimeline({ entries }: { entries: AppointmentHistoryEntry[] }) {
  if (!entries.length) return null;

  return (
    <Card shadow="sm" padding="md">
      <View style={styles.timeline}>
        {entries.map((entry, index) => {
          const isLast = index === entries.length - 1;
          const actionLabel =
            actionLabels[entry.action?.toLowerCase() ?? ''] ?? (entry.action ?? 'Événement');

          return (
            <Animated.View
              key={entry.id}
              entering={FadeInDown.delay(index * 60).duration(300)}
              style={styles.timelineItem}
            >
              {/* Dot + line */}
              <View style={styles.timelineLeft}>
                <View style={[styles.dot, index === 0 && styles.dotActive]} />
                {!isLast && <View style={styles.line} />}
              </View>

              {/* Content */}
              <View style={[styles.timelineContent, !isLast && styles.timelineContentGap]}>
                <Animated.Text style={styles.actionLabel}>{actionLabel}</Animated.Text>
                <View style={styles.metaRow}>
                  {entry.created_at ? (
                    <Animated.Text style={styles.metaText}>
                      {dayjs(entry.created_at).format('D MMM YYYY · HH:mm')}
                    </Animated.Text>
                  ) : null}
                  {entry.user_name ? (
                    <Animated.Text style={styles.metaText}> · {entry.user_name}</Animated.Text>
                  ) : null}
                </View>
              </View>
            </Animated.View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  timeline: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  timelineLeft: {
    alignItems: 'center',
    width: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    borderWidth: 2,
    borderColor: colors.borderLight,
    marginTop: 2,
    flexShrink: 0,
  },
  dotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  line: {
    flex: 1,
    width: 1.5,
    backgroundColor: colors.borderLight,
    marginTop: 4,
    marginBottom: 0,
  },
  timelineContent: {
    flex: 1,
    gap: 3,
  },
  timelineContentGap: {
    paddingBottom: spacing[4],
  },
  actionLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
});

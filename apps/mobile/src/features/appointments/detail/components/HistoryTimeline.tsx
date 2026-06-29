import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { Row } from '@/components/layout/primitives';
import { Card } from '@/components/ui/Card';
import type { AppointmentHistoryEntry } from '../api/appointment-detail.service';
import { scrollChildEntering } from '@/lib/platform/list-entering-animation';
import { radius, spacing } from '@/theme';
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
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_HistoryTimeline_tsx_styles');
  if (!entries.length) return null;

  return (
    <Card shadow="sm" padding="md">
      <View style={styles.timeline}>
        {entries.map((entry, index) => {
          const isLast = index === entries.length - 1;
          const actionLabel =
            actionLabels[entry.action?.toLowerCase() ?? ''] ?? (entry.action ?? 'Événement');
          const entering = scrollChildEntering(index, 60, 300);
          const Shell = entering ? Animated.View : View;

          return (
            <Shell key={entry.id} entering={entering}>
              <Row gap={spacing[3]} align="start">
                <View style={styles.timelineLeft}>
                  <View style={[styles.dot, index === 0 && styles.dotActive]} />
                  {!isLast && <View style={styles.line} />}
                </View>

                <View style={[styles.timelineContent, !isLast && styles.timelineContentGap]}>
                  <Text style={styles.actionLabel}>{actionLabel}</Text>
                  <Row wrap>
                    {entry.created_at ? (
                      <Text style={styles.metaText}>
                        {dayjs(entry.created_at).format('D MMM YYYY · HH:mm')}
                      </Text>
                    ) : null}
                    {entry.user_name ? (
                      <Text style={styles.metaText}> · {entry.user_name}</Text>
                    ) : null}
                  </Row>
                </View>
              </Row>
            </Shell>
          );
        })}
      </View>
    </Card>
  );
}

function buildStyles(c: AppColors) {
  return {
  timeline: {
    gap: 0,
  },
  timelineLeft: {
    alignItems: 'center' as const,
    width: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: c.border,
    borderWidth: 2,
    borderColor: c.borderLight,
    marginTop: 2,
    flexShrink: 0,
  },
  dotActive: {
    backgroundColor: c.primary,
    borderColor: c.primaryLight,
  },
  line: {
    minWidth: 0,
    flex: 1,
    width: 1.5,
    backgroundColor: c.borderLight,
    marginTop: 4,
    marginBottom: 0,
  },
  timelineContent: {
    minWidth: 0,
    flex: 1,
    gap: 3,
  },
  timelineContentGap: {
    paddingBottom: spacing[4],
  },
  actionLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  metaText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
};
}

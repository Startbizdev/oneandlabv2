import { View } from 'react-native';
import { Row, Stack } from '@/components/layout/primitives';
import { HealthRecordProgressRing } from '@/features/health-record/components/HealthRecordProgressRing';
import { useAppointmentListCardStyles } from '@/utils/appointment-list-card-styles';
import { spacing, progressRingSize, AppText, useStyles, font, type Theme } from '@/theme';
import { lh } from '@/theme/typography';
import type { NurseTourPayload } from '../api/nurse-tour.service';

type Props = {
  summary: NurseTourPayload['summary'];
  activeRemaining?: number;
};

export function TourSummaryCard({ summary, activeRemaining }: Props) {
  const styles = useStyles(buildStyles);
  const cardStyles = useAppointmentListCardStyles();
  const total = summary.total_stops;
  const done = summary.done_stops;
  const absent = summary.absent_stops ?? 0;
  const allAbsentOnly = total === 0 && absent > 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const remaining = activeRemaining ?? Math.max(0, total - done);

  if (total === 0 && absent === 0) return null;

  return (
    <View style={[cardStyles.cardShell, cardStyles.card, styles.card]}>
      <Row gap={spacing[3]} align="center">
        <HealthRecordProgressRing percent={allAbsentOnly ? 0 : pct} size={progressRingSize.md} strokeWidth={4} />
        <Stack gap={spacing[0.5]} style={styles.copy}>
          {allAbsentOnly ? (
            <>
              <AppText style={styles.title}>Aucun passage à faire</AppText>
              <AppText style={styles.sub}>
                Vous avez {absent} patient{absent > 1 ? 's' : ''} absent{absent > 1 ? 's' : ''}
              </AppText>
            </>
          ) : (
            <>
              <AppText style={styles.title}>
                {done} sur {total} passage{total > 1 ? 's' : ''}
              </AppText>
              <AppText style={styles.sub}>
                {[
                  remaining > 0 ? `${remaining} restant${remaining > 1 ? 's' : ''}` : 'Tournée terminée',
                  absent > 0 ? `${absent} absent${absent > 1 ? 's' : ''}` : null,
                  `${summary.estimated_km} km estimés`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </AppText>
            </>
          )}
        </Stack>
      </Row>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    card: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
    },
    copy: { flex: 1, minWidth: 0 },
    title: {
      ...font.heading,
      fontSize: fontSize.lg,
      lineHeight: lh(fontSize.lg),
      color: c.textPrimary,
    },
    sub: {
      ...font.medium,
      fontSize: fontSize.sm,
      lineHeight: lh(fontSize.sm),
      color: c.textSecondary,
    },
  };
}

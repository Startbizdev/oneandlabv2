import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { buildAiDeepLink } from '@/features/ai-hub/utils/ai-navigation';
import { bookingNewHref } from '@/navigation/role-hrefs';
import type { HealthRecordGap } from '../api/health-record.service';
import { recordGapAction } from '../api/health-record.service';
import { radius, spacing, AppText, useStyles, type Theme } from '@/theme';

interface Props {
  gap: HealthRecordGap;
}

function gapHref(action: string | null | undefined): Href | null {
  switch (action) {
    case 'complete_carnet':
      return '/(patient)/health-record/wizard';
    case 'reconnect_health':
      return '/(patient)/health-data';
    case 'book_blood_test':
    case 'book_prevention':
    case 'book_followup':
      return bookingNewHref('/(patient)');
    default:
      return null;
  }
}

export function HealthRecordGapActionCard({ gap }: Props) {
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const cta = gap.cta_fr ?? 'En savoir plus';

  const onPress = () => {
    recordGapAction(gap.gap_key, 'clicked').catch((e: unknown) => {
      console.warn('[health-record] gap action not recorded', gap.gap_key, e);
    });
    const href = gapHref(gap.action);
    if (href) {
      router.push(href);
      return;
    }
    router.push(
      buildAiDeepLink('patient', {
        conversation_type: 'assistant_health',
        initial_message: gap.label_fr,
      }),
    );
  };

  return (
    <View style={styles.card}>
      <AppText>{gap.label_fr}</AppText>
      <Button title={cta} variant="secondary" size="sm" onPress={onPress} />
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      padding: spacing[4],
      gap: spacing[3],
    },
  };
}

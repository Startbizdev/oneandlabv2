import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { buildAiDeepLink } from '@/features/ai-hub/utils/ai-navigation';
import type { HealthRecordGap } from '../api/health-record.service';
import { recordGapAction } from '../api/health-record.service';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  gap: HealthRecordGap;
}

function gapHref(action: string | null | undefined): string | null {
  switch (action) {
    case 'complete_carnet':
      return '/(patient)/health-record/wizard';
    case 'reconnect_health':
      return '/(patient)/health-data';
    case 'book_blood_test':
      return '/(patient)/booking/new';
    case 'book_prevention':
    case 'book_followup':
      return '/(patient)/booking/new';
    default:
      return null;
  }
}

export function HealthRecordGapActionCard({ gap }: Props) {
  const styles = useThemedStyles(buildStyles, 'HealthRecordGapActionCard');
  const router = useRouter();
  const cta = gap.cta_fr ?? 'En savoir plus';

  const onPress = () => {
    void recordGapAction(gap.gap_key, 'clicked').catch(() => undefined);
    const href = gapHref(gap.action);
    if (href) {
      router.push(href as never);
      return;
    }
    router.push(
      buildAiDeepLink('patient', {
        conversation_type: 'assistant_health',
        initial_message: gap.label_fr,
      }) as never,
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{gap.label_fr}</Text>
      <Button title={cta} size="sm" onPress={onPress} />
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    card: {
      backgroundColor: c.warningLight ?? c.primaryLight,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: spacing[4],
      marginBottom: spacing[3],
      gap: spacing[3],
    },
    label: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      color: c.textPrimary,
      lineHeight: 20,
    },
  };
}

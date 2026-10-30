import type { MobileRole } from '@oneandlab/shared-constants';
import { memo, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useStore } from 'zustand';
import { Button } from '@/components/ui/Button';
import { AppText, radius, spacing, useStyles, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import type { AssistantActionTarget } from '../utils/assistant-actions';
import type { LiveTurnStore } from '../utils/live-turn';
import { ActionCards } from './ActionCards';
import { AssistantMarkdown } from './AssistantMarkdown';
import { EmergencyCard, emergencyNumbers } from './EmergencyCard';
import { UserBubble } from './MessageRow';

type Props = {
  live: LiveTurnStore;
  role: MobileRole;
  patientId?: string;
  onAction: (target: AssistantActionTarget) => void;
  onRetry: () => void;
};

/** Curseur qui clignote doucement en fin de texte pendant la génération. */
function Cursor() {
  const styles = useStyles(buildStyles);
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.2, { duration: 500 }), -1, true);
    return () => cancelAnimation(opacity);
  }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.cursor, animated]} accessibilityElementsHidden importantForAccessibility="no" />;
}

/** Tour en cours : seul composant abonné au flux, re-rendu à chaque mot reçu. */
export const LiveTurnRow = memo(function LiveTurnRow({ live, role, patientId, onAction, onRetry }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const turn = useStore(live.store);
  if (turn.phase === 'idle') return null;
  const streaming = turn.phase === 'streaming';
  const waiting = streaming && (turn.status !== null || !turn.text);

  return (
    <View style={styles.root}>
      <UserBubble text={turn.userText} attachment={turn.documentName} />
      {turn.emergency ? (
        <EmergencyCard
          message={turn.emergency.message}
          numbers={emergencyNumbers(turn.actions, turn.emergency.number)}
        />
      ) : (
        <View style={styles.reply} accessibilityLiveRegion="polite">
          {turn.text ? <AssistantMarkdown text={turn.text} /> : null}
          {waiting ? (
            <View style={styles.status}>
              <ActivityIndicator size="small" color={c.textTertiary} />
              <AppText variant="caption" style={styles.statusText}>
                {turn.status ?? 'Cary réfléchit…'}
              </AppText>
            </View>
          ) : streaming ? (
            <Cursor />
          ) : null}
          <ActionCards actions={turn.actions} role={role} patientId={patientId} onAction={onAction} />
        </View>
      )}
      {turn.error ? (
        <View style={styles.error}>
          <AppText variant="caption" style={styles.errorText} accessibilityRole="alert">
            {turn.error.message}
          </AppText>
          {turn.error.retryable ? <Button title="Réessayer" variant="outline" size="sm" onPress={onRetry} /> : null}
        </View>
      ) : null}
    </View>
  );
});

function buildStyles({ colors: c }: Theme) {
  return {
    root: { gap: spacing[5] },
    reply: { gap: spacing[3] },
    status: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing[2] },
    statusText: { color: c.textTertiary },
    cursor: { width: spacing[2.5], height: spacing[2.5], borderRadius: radius.full, backgroundColor: c.textPrimary },
    error: { alignItems: 'flex-start' as const, gap: spacing[2] },
    errorText: { color: c.error },
  };
}

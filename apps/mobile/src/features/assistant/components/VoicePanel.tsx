import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Keyboard, Mic, Square } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { AppText, ICON_STROKE_WIDTH, iconSize, radius, spacing, useStyles, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import type { VoiceState } from '../utils/voice-controller';

const MIC_SIZE = spacing[16] + spacing[2];

const LABELS = {
  idle: '',
  listening: 'Écoute…',
  thinking: 'Cary réfléchit…',
  speaking: 'Cary répond…',
} as const;

const HINTS = {
  idle: '',
  listening: 'Touchez le micro quand vous avez fini.',
  thinking: 'Touchez le micro pour reprendre la parole.',
  speaking: 'Touchez le micro pour l’interrompre.',
} as const;

type Props = { state: VoiceState; onMicPress: () => void; onExit: () => void };

/** Mode vocal : grand micro (pulsation pendant l'écoute), transcription en direct, état de Cary. */
export function VoicePanel({ state, onMicPress, onExit }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const listening = state.phase === 'listening';
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (listening) pulse.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
    else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: 150 });
    }
    return () => cancelAnimation(pulse);
  }, [listening, pulse]);

  const halo = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - pulse.value) + 0.1,
    transform: [{ scale: 1 + pulse.value * 0.35 }],
  }));

  return (
    <View style={styles.root} accessibilityLiveRegion="polite">
      <AppText variant="headline">{LABELS[state.phase]}</AppText>
      {state.partial && state.phase !== 'speaking' ? (
        <AppText variant="body" style={styles.partial}>
          {state.partial}
        </AppText>
      ) : null}
      <View style={styles.micWrap}>
        <Animated.View style={[styles.halo, halo]} />
        <Pressable
          onPress={onMicPress}
          style={({ pressed }) => [styles.mic, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={listening ? 'Terminer et envoyer' : 'Interrompre Cary et parler'}
        >
          {listening ? (
            <Square size={iconSize.lg} color={c.onPrimary} fill={c.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
          ) : (
            <Mic size={iconSize.xl} color={c.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
          )}
        </Pressable>
      </View>
      <AppText variant="caption" style={styles.center}>
        {HINTS[state.phase]}
      </AppText>
      <Button
        title="Clavier"
        variant="ghost"
        size="sm"
        onPress={onExit}
        leftIcon={<Keyboard size={iconSize.sm} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />}
      />
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    root: { alignItems: 'center' as const, gap: spacing[2], paddingTop: spacing[2] },
    partial: { textAlign: 'center' as const, color: c.textSecondary },
    micWrap: {
      width: MIC_SIZE * 1.5,
      height: MIC_SIZE * 1.5,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    halo: {
      position: 'absolute' as const,
      width: MIC_SIZE,
      height: MIC_SIZE,
      borderRadius: radius.full,
      backgroundColor: c.primary,
    },
    mic: {
      width: MIC_SIZE,
      height: MIC_SIZE,
      borderRadius: radius.full,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.primary,
    },
    pressed: { opacity: 0.8 },
    center: { textAlign: 'center' as const },
  };
}

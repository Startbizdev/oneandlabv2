import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { hexToRgba } from '@/theme/color-utils';
import { useAppColors } from '@/theme/use-app-colors';
import { AppText, spacing, useStyles } from '@/theme';

export type VoiceActivityMode = 'idle' | 'user' | 'assistant' | 'processing' | 'connecting' | 'reconnecting';

const ORB = 96;
const STAGE = 120;

interface Props {
  mode: VoiceActivityMode;
  title: string | null;
  voiceEnergy: number;
  sessionActive: boolean;
  /** Toucher l'orbe pendant que Cary parle = l'interrompre. */
  onInterrupt?: () => void;
}

/** Orbe d'activité vocale : respire selon la phase, réagit à l'énergie de la voix. */
export function CaryVoiceOrb({ mode, title, voiceEnergy, sessionActive, onInterrupt }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const breathe = useSharedValue(1);
  const ring = useSharedValue(0.72);
  const energy = useSharedValue(0);

  useEffect(() => {
    energy.value = withTiming(voiceEnergy, { duration: 120 });
  }, [energy, voiceEnergy]);

  useEffect(() => {
    cancelAnimation(breathe);
    cancelAnimation(ring);
    if (!sessionActive || mode === 'idle') {
      breathe.value = withTiming(1, { duration: 280 });
      ring.value = withTiming(0.72, { duration: 280 });
      return;
    }

    const breatheScale =
      mode === 'user' ? 1.08 : mode === 'assistant' ? 1.05 : mode === 'processing' ? 1.03 : 1;
    const breatheMs = mode === 'assistant' ? 900 : mode === 'processing' ? 1100 : 700;

    breathe.value = withRepeat(
      withSequence(
        withTiming(breatheScale, { duration: breatheMs, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: breatheMs, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );

    ring.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: breatheMs + 120, easing: Easing.out(Easing.quad) }),
        withTiming(0.72, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [breathe, mode, ring, sessionActive]);

  const orbColor = mode === 'assistant' ? c.primaryDark : c.primary;
  const orbStyle = useAnimatedStyle(() => {
    const energyBoost = mode === 'user' ? energy.value * 0.14 : 0;
    return { transform: [{ scale: breathe.value + energyBoost }] };
  });

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ring.value }],
    opacity: interpolate(ring.value, [0.72, 1.18], [0.45, 0]),
  }));

  const coreStyle = useAnimatedStyle(() => ({
    opacity: mode === 'processing' ? 0.72 : 0.92 + energy.value * 0.08,
    transform: [{ scale: 0.42 + energy.value * 0.12 }],
  }));

  const interactive = sessionActive && mode === 'assistant';

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={interactive ? onInterrupt : undefined}
        disabled={!interactive}
        accessibilityRole="button"
        accessibilityLabel={
          mode === 'assistant' ? 'Interrompre Cary' : mode === 'user' ? 'Écoute en cours' : 'Assistant vocal Cary'
        }
        accessibilityHint={mode === 'assistant' ? 'Toucher pour reprendre la parole' : undefined}
        style={styles.stage}
      >
        <Animated.View style={[styles.ring, ringStyle, { borderColor: hexToRgba(orbColor, 0.28) }]} />
        <Animated.View
          style={[styles.orb, orbStyle, { backgroundColor: hexToRgba(orbColor, mode === 'processing' ? 0.12 : 0.2) }]}
        >
          <Animated.View
            style={[
              styles.orb,
              coreStyle,
              { backgroundColor: mode === 'processing' ? hexToRgba(orbColor, 0.8) : orbColor },
            ]}
          />
        </Animated.View>
      </Pressable>

      {title ? (
        <AppText variant="secondary" style={styles.title} accessibilityLiveRegion="polite">
          {title}
        </AppText>
      ) : null}
    </View>
  );
}

function buildStyles() {
  return {
    wrap: { alignItems: 'center' as const, gap: spacing[2] },
    stage: {
      width: STAGE,
      height: STAGE,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    ring: {
      position: 'absolute' as const,
      width: ORB,
      height: ORB,
      borderRadius: ORB / 2,
      borderWidth: 1.5,
    },
    orb: {
      width: ORB,
      height: ORB,
      borderRadius: ORB / 2,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    title: { textAlign: 'center' as const },
  };
}

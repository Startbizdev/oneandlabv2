import type { AppColors } from '@/theme/colors';
import { hexToRgba } from '@/theme/color-utils';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeIn,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, Square, X } from 'lucide-react-native';
import { PATIENT_AI_VOICE_MOCK_HINT } from '../constants/patient-ai-mock';
import { animation, elevation, H_PADDING, radius, spacing } from '@/theme';
import { fontFamily, fontSize, lh } from '@/theme/typography';

const PULSE_RING_COUNT = 3;
const WAVEFORM_BAR_COUNT = 12;
const ORB_SIZE = 136;
const HUB_TOUCH_SIZE = 260;

interface Props {
  visible: boolean;
  onClose: () => void;
}

function PulseRing({
  index,
  active,
  styles,
}: {
  index: number;
  active: boolean;
  styles: ReturnType<typeof buildStyles>;
}) {
  const c = useAppColors();
  const scale = useSharedValue(0.72);
  const opacity = useSharedValue(0.4);
  const baseSize = 168 + index * 48;

  useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(opacity);
    const duration = active ? 1400 : 2600;
    const delay = index * (active ? 280 : 520);
    const maxScale = active ? 1.55 : 1.38;
    const startOpacity = active ? 0.5 : 0.32;

    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.72, { duration: 0 }),
          withTiming(maxScale, { duration, easing: Easing.out(Easing.cubic) }),
        ),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(startOpacity, { duration: 0 }),
          withTiming(0, { duration, easing: Easing.out(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [active, index, opacity, scale]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        ringStyle,
        {
          width: baseSize,
          height: baseSize,
          borderRadius: baseSize / 2,
          borderColor: hexToRgba(c.primary, active ? 0.45 : 0.22),
          borderWidth: active ? 2.5 : 1.5,
        },
      ]}
    />
  );
}

function WaveformBar({
  index,
  active,
  styles,
}: {
  index: number;
  active: boolean;
  styles: ReturnType<typeof buildStyles>;
}) {
  const c = useAppColors();
  const level = useSharedValue(0.22);

  useEffect(() => {
    cancelAnimation(level);
    if (!active) {
      level.value = withTiming(0.22, { duration: 280 });
      return;
    }
    const peak = 0.55 + (index % 4) * 0.14;
    level.value = withDelay(
      index * 55,
      withRepeat(
        withSequence(
          withTiming(peak, { duration: 260 + (index % 3) * 70, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.18, { duration: 240 + (index % 2) * 80, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, [active, index, level]);

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: level.value }],
    opacity: interpolate(level.value, [0.18, 0.9], [0.35, 1]),
  }));

  return (
    <Animated.View
      style={[
        styles.waveBar,
        barStyle,
        { backgroundColor: hexToRgba(c.primary, active ? 0.85 : 0.35) },
      ]}
    />
  );
}

function VoiceHub({
  listening,
  onToggle,
  styles,
}: {
  listening: boolean;
  onToggle: () => void;
  styles: ReturnType<typeof buildStyles>;
}) {
  const c = useAppColors();
  const orbScale = useSharedValue(1);
  const glowScale = useSharedValue(1);
  const pressed = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(orbScale);
    cancelAnimation(glowScale);
    if (listening) {
      orbScale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 520, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 520, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.18, { duration: 640, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.94, { duration: 640, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
      return;
    }
    orbScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    glowScale.value = withTiming(1, { duration: 320 });
  }, [glowScale, listening, orbScale]);

  const orbAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: orbScale.value * (1 - pressed.value * 0.04) },
    ],
  }));

  const glowAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: listening ? 0.55 : 0.28,
  }));

  return (
    <Pressable
      onPress={onToggle}
      onPressIn={() => {
        pressed.value = withSpring(1, animation.spring.snappy);
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, animation.spring.gentle);
      }}
      style={styles.hubTouch}
      accessibilityRole="button"
      accessibilityLabel={listening ? 'Arrêter de parler' : 'Appuyer pour parler à Cary'}
      accessibilityState={{ selected: listening }}
    >
      <View style={styles.hubStack} pointerEvents="none">
        <View style={styles.ringsLayer}>
          {Array.from({ length: PULSE_RING_COUNT }, (_, i) => (
            <PulseRing key={i} index={i} active={listening} styles={styles} />
          ))}
        </View>

        <Animated.View
          style={[
            styles.glowOrb,
            glowAnimStyle,
            { backgroundColor: hexToRgba(c.primary, listening ? 0.38 : 0.2) },
          ]}
        />

        <Animated.View
          style={[
            styles.micOrb,
            orbAnimStyle,
            {
              backgroundColor: listening ? c.primaryDark : c.primary,
              borderColor: hexToRgba(c.textInverse, listening ? 0.35 : 0.15),
            },
          ]}
        >
          {listening ? (
            <Square size={36} color={c.textInverse} strokeWidth={2.5} fill={c.textInverse} />
          ) : (
            <Mic size={44} color={c.textInverse} strokeWidth={2.25} />
          )}
        </Animated.View>
      </View>
    </Pressable>
  );
}

/** Overlay mock — mode vocal Cary (tap centre pour parler, style ChatGPT). */
export function PatientAiVoiceMockOverlay({ visible, onClose }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const insets = useSafeAreaInsets();
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (!visible) setListening(false);
  }, [visible]);

  const handleToggle = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setListening((prev) => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setListening(false);
    onClose();
  }, [onClose]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={[styles.root, { backgroundColor: c.background }]}>
        <LinearGradient
          colors={[c.background, c.primaryLight, c.background]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={[styles.shell, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.header}>
            <Pressable
              onPress={handleClose}
              hitSlop={12}
              style={[styles.closeBtn, { backgroundColor: hexToRgba(c.textPrimary, 0.06) }]}
              accessibilityRole="button"
              accessibilityLabel="Fermer le mode vocal"
            >
              <X size={22} color={c.textSecondary} strokeWidth={2.25} />
            </Pressable>
          </View>

          <Animated.View entering={FadeIn.duration(360)} style={styles.centerColumn}>
            <View style={styles.statusBlock}>
              <Text style={[styles.statusTitle, { color: c.textPrimary }]}>
                {listening ? 'Parlez maintenant' : 'Appuyez pour parler'}
              </Text>
              <Text style={[styles.statusSub, { color: c.textSecondary }]}>
                {listening
                  ? 'Touchez le centre pour arrêter.'
                  : 'Tapez au centre du micro pour démarrer.'}
              </Text>
            </View>

            <VoiceHub listening={listening} onToggle={handleToggle} styles={styles} />

            <View style={styles.waveZone}>
              {listening ? (
                <Animated.View entering={FadeIn.duration(280)} style={styles.waveRow}>
                  {Array.from({ length: WAVEFORM_BAR_COUNT }, (_, i) => (
                    <WaveformBar key={i} index={i} active styles={styles} />
                  ))}
                </Animated.View>
              ) : (
                <Text style={[styles.waveHint, { color: c.textTertiary }]}>
                  L’onde apparaît quand vous parlez
                </Text>
              )}
            </View>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={[styles.footerKicker, { color: c.textTertiary }]}>Mode vocal · démo</Text>
            <Text style={[styles.footerHint, { color: c.textTertiary }]}>{PATIENT_AI_VOICE_MOCK_HINT}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function buildStyles(_c: AppColors) {
  return {
    root: {
      flex: 1,
    },
    shell: {
      flex: 1,
    },
    header: {
      flexDirection: 'row' as const,
      justifyContent: 'flex-end' as const,
      paddingHorizontal: H_PADDING,
      paddingBottom: spacing[2],
    },
    closeBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    centerColumn: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: H_PADDING,
      gap: spacing[6],
    },
    statusBlock: {
      alignItems: 'center' as const,
      gap: spacing[2],
      maxWidth: 320,
    },
    statusTitle: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize['2xl'],
      textAlign: 'center' as const,
    },
    statusSub: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.base,
      lineHeight: lh(fontSize.base),
      textAlign: 'center' as const,
    },
    hubTouch: {
      width: HUB_TOUCH_SIZE,
      height: HUB_TOUCH_SIZE,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    hubStack: {
      width: HUB_TOUCH_SIZE,
      height: HUB_TOUCH_SIZE,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    ringsLayer: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    pulseRing: {
      position: 'absolute' as const,
    },
    glowOrb: {
      position: 'absolute' as const,
      width: ORB_SIZE + 72,
      height: ORB_SIZE + 72,
      borderRadius: (ORB_SIZE + 72) / 2,
    },
    micOrb: {
      width: ORB_SIZE,
      height: ORB_SIZE,
      borderRadius: ORB_SIZE / 2,
      borderWidth: 2,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      zIndex: 3,
      ...elevation.lg,
    },
    waveZone: {
      height: 56,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    waveRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing[1.5],
      height: 56,
    },
    waveBar: {
      width: 4,
      height: 44,
      borderRadius: radius.full,
    },
    waveHint: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      textAlign: 'center' as const,
    },
    footer: {
      paddingHorizontal: spacing[5],
      paddingTop: spacing[2],
      paddingBottom: spacing[3],
      gap: spacing[1],
      alignItems: 'center' as const,
    },
    footerKicker: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      textAlign: 'center' as const,
    },
    footerHint: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs, 1.45),
      textAlign: 'center' as const,
    },
  };
}

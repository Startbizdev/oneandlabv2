import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { useEffect, useRef, useState } from 'react';
import { Image, Modal, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const LOGO = require('../../../../../../assets/logo-cary.png');

const STATUS_LINES = [
  'Préparation du rendez-vous…',
  'Confirmation de votre prise en charge…',
  'Synchronisation de votre planning…',
  'Finalisation en cours…',
] as const;

interface Props {
  visible: boolean;
  /** Passe à true quand l’API et le prefetch sont terminés — barre à 100 % puis onFinish. */
  complete: boolean;
  onFinish: () => void;
}

export function OfferAcceptPreparationOverlay({ visible, complete, onFinish }: Props) {
  const c = useAppColors();
  const progress = useSharedValue(0);
  const logoScale = useSharedValue(1);
  const onFinishRef = useRef(onFinish);
  const finishedRef = useRef(false);
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    if (!visible) {
      progress.value = 0;
      logoScale.value = 1;
      finishedRef.current = false;
      setStatusIndex(0);
      return;
    }

    finishedRef.current = false;
    progress.value = 0;
    progress.value = withTiming(0.78, {
      duration: 4200,
      easing: Easing.out(Easing.cubic),
    });

    logoScale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [visible, logoScale, progress]);

  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => {
      setStatusIndex((i) => (i + 1) % STATUS_LINES.length);
    }, 1800);
    return () => clearInterval(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible || !complete) return;

    const invokeFinish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      onFinishRef.current();
    };

    progress.value = withTiming(
      1,
      { duration: 450, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(invokeFinish)();
        }
      },
    );

    // Filet de sécurité si le callback Reanimated ne part pas (onFinish recréé, etc.).
    const fallback = setTimeout(invokeFinish, 700);
    return () => clearTimeout(fallback);
  }, [complete, progress, visible]);

  const barFillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(4, progress.value * 100)}%`,
  }));

  const logoAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  if (!visible) return null;

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen" statusBarTranslucent>
      <View style={styles.root}>
        <LinearGradient
          colors={[c.primaryLight, c.background, c.surfaceSubtle]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.glowTop} pointerEvents="none" />
        <View style={styles.glowBottom} pointerEvents="none" />

        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.content}>
            <Animated.View style={[styles.logoWrap, logoAnimStyle]}>
              <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="Cary" />
            </Animated.View>

            <Text style={styles.title}>Préparation du rendez-vous</Text>
            <Text style={styles.subtitle}>{STATUS_LINES[statusIndex]}</Text>
            <Text style={styles.tagline}>Votre espace Cary se met à jour pour accueillir ce nouveau soin.</Text>

            <View style={styles.progressBlock}>
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFillWrap, barFillStyle]}>
                  <LinearGradient
                    colors={[colors.gradientStart, colors.gradientEnd]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.progressFill}
                  />
                </Animated.View>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function buildStyles(c: AppColors) {
  return {
  root: {
    flex: 1,
    backgroundColor: c.background,
  },
  glowTop: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(22, 182, 214, 0.14)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -60,
    left: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    gap: spacing[3],
  },
  logoWrap: {
    marginBottom: spacing[2],
  },
  logo: {
    width: 140,
    height: 44,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    color: c.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: c.primaryDark,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.55,
    maxWidth: 300,
  },
  progressBlock: {
    width: '100%',
    maxWidth: 320,
    marginTop: spacing[4],
  },
  progressTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: c.surfaceAlt,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  progressFillWrap: {
    height: '100%',
    minWidth: 8,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    flex: 1,
    borderRadius: radius.full,
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_appointments_detail_components_offer_OfferAcceptPreparationOverlay_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});

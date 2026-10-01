import { useEffect, useRef } from 'react';
import { Image, Modal, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radius, spacing, AppText, useLayoutMetrics, responsiveValue, useStyles, type Theme } from '@/theme';

const LOGO = require('../../../../../../assets/logo-cary.png');

interface Props {
  visible: boolean;
  /** Passe à true quand l’API et le prefetch sont terminés — barre à 100 % puis onFinish. */
  complete: boolean;
  onFinish: () => void;
}

export function OfferAcceptPreparationOverlay({ visible, complete, onFinish }: Props) {
  const layout = useLayoutMetrics();
  const styles = useStyles(buildStyles);
  const progressMaxWidth = responsiveValue(layout, { compact: 280, default: 320, wide: 360 });
  const progress = useSharedValue(0);
  const onFinishRef = useRef(onFinish);
  const finishedRef = useRef(false);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    if (!visible) {
      progress.value = 0;
      finishedRef.current = false;
      return;
    }

    finishedRef.current = false;
    progress.value = 0;
    progress.value = withTiming(0.78, {
      duration: 4200,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, progress]);

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

  if (!visible) return null;

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen" statusBarTranslucent>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.content} accessibilityRole="progressbar" accessibilityLabel="Confirmation du rendez-vous">
          <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="Cary" />
          <AppText variant="title" style={styles.title}>
            Confirmation du rendez-vous
          </AppText>
          <View style={[styles.progressTrack, { maxWidth: progressMaxWidth }]}>
            <Animated.View style={[styles.progressFill, barFillStyle]} />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function buildStyles({ colors: c, scale }: Theme) {
  return {
    root: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      minWidth: 0,
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing[6],
      gap: spacing[5],
    },
    logo: {
      width: scale(140),
      height: scale(44),
    },
    title: {
      textAlign: 'center' as const,
    },
    progressTrack: {
      width: '100%' as const,
      height: spacing[1.5],
      borderRadius: radius.full,
      backgroundColor: c.surfaceAlt,
      overflow: 'hidden' as const,
    },
    progressFill: {
      height: '100%' as const,
      borderRadius: radius.full,
      backgroundColor: c.primary,
    },
  };
}

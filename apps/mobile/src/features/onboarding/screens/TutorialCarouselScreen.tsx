import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getTutorialConfig, isTutorialRole, type TutorialSlide } from '@oneandlab/onboarding';
import { getRoleHome } from '@/features/auth/hooks/use-auth-guard';
import { SHOW_PRESCRIPTIONS_TAB_NAV } from '@/features/prescriptions/constants';
import { useAuthStore } from '@/store/auth-store';
import { useAppPreferencesStore } from '@/store/app-preferences-store';
import { Button } from '@/components/ui/Button';
import { Row } from '@/components/layout/primitives';
import { TutorialIllustration } from '../components/TutorialIllustration';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function TutorialCarouselScreen() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'TutorialCarouselScreen');
  const router = useRouter();
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const role = useAuthStore((s) => s.user?.role);
  const setOnboardingCompleted = useAppPreferencesStore((s) => s.setOnboardingCompleted);
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<TutorialSlide>>(null);
  const [index, setIndex] = useState(0);
  const [carouselHeight, setCarouselHeight] = useState(Math.max(height * 0.58, 420));

  const isReplay = replay === '1' || replay === 'true';
  const config = useMemo(() => {
    if (!isTutorialRole(role)) return null;
    return getTutorialConfig(role, { showPrescriptions: SHOW_PRESCRIPTIONS_TAB_NAV });
  }, [role]);

  const slides = config?.slides ?? [];
  const lastIndex = Math.max(0, slides.length - 1);
  const isLast = index >= lastIndex;

  const finish = useCallback(() => {
    if (role && isTutorialRole(role) && !isReplay) {
      setOnboardingCompleted(role, true);
    }
    if (role) {
      router.replace(getRoleHome(role));
    }
  }, [isReplay, role, router, setOnboardingCompleted]);

  const goNext = useCallback(() => {
    if (isLast) {
      finish();
      return;
    }
    const next = index + 1;
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  }, [finish, index, isLast]);

  const goPrev = useCallback(() => {
    if (index <= 0) return;
    const prev = index - 1;
    listRef.current?.scrollToIndex({ index: prev, animated: true });
    setIndex(prev);
  }, [index]);

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
      setIndex(Math.max(0, Math.min(nextIndex, lastIndex)));
    },
    [lastIndex, width],
  );

  if (!config || slides.length === 0) {
    return null;
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[c.primaryLight, c.background, c.background]}
        locations={[0, 0.35, 1]}
        style={styles.gradient}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Row align="center" justify="between" style={styles.topBar}>
          <Text style={styles.kicker}>{config.welcomeTitle}</Text>
          <Pressable onPress={finish} hitSlop={12} accessibilityRole="button" accessibilityLabel="Passer">
            <Text style={styles.skip}>Passer</Text>
          </Pressable>
        </Row>

        <View
          style={styles.carouselHost}
          onLayout={(event) => {
            const next = event.nativeEvent.layout.height;
            if (next > 0) setCarouselHeight(next);
          }}
        >
          <FlatList
            ref={listRef}
            data={slides}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumScrollEnd}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            style={styles.carouselList}
            renderItem={({ item }) => (
              <View style={[styles.slidePage, { width, height: carouselHeight }]}>
                <View style={styles.slideCenter}>
                  <TutorialIllustration illustration={item.illustration} />
                  <View style={styles.copy}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.body}>{item.body}</Text>
                  </View>
                </View>
              </View>
            )}
          />
        </View>

        <View style={styles.footer}>
          <Row justify="center" gap={spacing[1.5]} style={styles.dots}>
            {slides.map((slide, dotIndex) => (
              <View
                key={slide.id}
                style={[
                  styles.dot,
                  dotIndex === index ? styles.dotActive : styles.dotIdle,
                  dotIndex === index
                    ? { backgroundColor: c.primary }
                    : { backgroundColor: c.border },
                ]}
              />
            ))}
          </Row>

          <Row gap={spacing[3]} style={styles.actions}>
            {index > 0 ? (
              <View style={styles.actionFlex}>
                <Button title="Précédent" variant="outline" fullWidth onPress={goPrev} />
              </View>
            ) : null}
            <View style={styles.actionFlex}>
              <Button
                title={isLast ? 'Commencer' : 'Suivant'}
                fullWidth
                size="lg"
                onPress={goNext}
              />
            </View>
          </Row>
        </View>
      </SafeAreaView>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    root: { flex: 1, backgroundColor: c.background },
    gradient: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 },
    safe: { flex: 1 },
    topBar: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[2],
      paddingBottom: spacing[1],
    },
    kicker: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.sm,
      color: c.primaryDark,
      letterSpacing: 0.2,
    },
    skip: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    carouselHost: {
      flex: 1,
      minHeight: 0,
    },
    carouselList: {
      flex: 1,
    },
    slidePage: {
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing[4],
    },
    slideCenter: {
      width: '100%' as const,
      maxWidth: 360,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing[5],
    },
    copy: {
      width: '100%' as const,
      gap: spacing[2],
      paddingHorizontal: spacing[1],
    },
    title: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.xl,
      color: c.textPrimary,
      letterSpacing: -0.4,
      lineHeight: fontSize.xl * 1.15,
      textAlign: 'center' as const,
    },
    body: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.base,
      color: c.textSecondary,
      lineHeight: fontSize.base * 1.5,
      textAlign: 'center' as const,
    },
    footer: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[2],
      paddingBottom: spacing[2],
      gap: spacing[4],
    },
    dots: { marginBottom: spacing[1] },
    dot: { height: 8, borderRadius: radius.full },
    dotActive: { width: 24 },
    dotIdle: { width: 8 },
    actions: { alignItems: 'stretch' as const },
    actionFlex: { flex: 1, minWidth: 0 },
  };
}

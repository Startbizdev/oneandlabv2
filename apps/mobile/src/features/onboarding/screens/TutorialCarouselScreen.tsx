import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { getTutorialConfig, isTutorialRole, type TutorialSlide } from '@oneandlab/onboarding';
import { getRoleHome } from '@/features/auth/hooks/use-auth-guard';
import { offerBiometricEnrollment } from '@/features/auth/utils/offer-biometric-enrollment';
import { PushPermissionPrompt } from '@/features/notifications/components/PushPermissionPrompt';
import { shouldExplainPushPermission } from '@/features/notifications/hooks/use-push-permission-activation';
import { SHOW_PRESCRIPTIONS_TAB_NAV } from '@/features/prescriptions/constants';
import { useToast } from '@/providers/ToastProvider';
import { useAuthStore } from '@/store/auth-store';
import { useAppPreferencesStore } from '@/store/app-preferences-store';
import { Button } from '@/components/ui/Button';
import { Row } from '@/components/layout/primitives';
import { TutorialIllustration } from '../components/TutorialIllustration';
import { selectOnboardingSlides } from '../constants/onboarding-slides';
import { radius, spacing, useLayoutMetrics, carouselHeight as computeCarouselHeight, AppText, useStyles, font, type Theme } from '@/theme';

const PATIENT_BOOKING_HREF: Href = '/(patient)/(tabs)/book';
const ILLUSTRATION_MAX_HEIGHT = 320;
/** Part de la page laissée à l'illustration : le titre et l'aide restent visibles en grande police. */
const ILLUSTRATION_HEIGHT_RATIO = 0.42;

function roleHomeOrNull(role: string | undefined): Href | null {
  if (!role) return null;
  return getRoleHome(role);
}

export function TutorialCarouselScreen() {
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { show: toast } = useToast();
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const role = useAuthStore((s) => s.user?.role);
  const firstName = useAuthStore((s) => s.user?.first_name?.trim());
  const setOnboardingCompleted = useAppPreferencesStore((s) => s.setOnboardingCompleted);
  const layout = useLayoutMetrics();
  const listRef = useRef<FlatList<TutorialSlide>>(null);
  const [index, setIndex] = useState(0);
  const [slideHeight, setSlideHeight] = useState(() => computeCarouselHeight(layout.usableHeight));
  const [pushTarget, setPushTarget] = useState<Href | null>(null);
  /** `FlatList` ne re-rend ses pages que si `extraData` change : hauteur mesurée et page active. */
  const listExtraData = useMemo(() => ({ slideHeight, index }), [slideHeight, index]);
  const illustrationHeight = Math.min(ILLUSTRATION_MAX_HEIGHT, Math.round(slideHeight * ILLUSTRATION_HEIGHT_RATIO));

  const isReplay = replay === '1' || replay === 'true';
  const isPatient = role === 'patient';
  const config = useMemo(() => {
    if (!isTutorialRole(role)) return null;
    return getTutorialConfig(role, { showPrescriptions: SHOW_PRESCRIPTIONS_TAB_NAV });
  }, [role]);

  const slides = useMemo(() => (config ? selectOnboardingSlides(config) : []), [config]);
  const lastIndex = Math.max(0, slides.length - 1);
  const isLast = index >= lastIndex;
  /** Fin du parcours : onboarding marqué terminé, puis proposition biométrie, puis navigation. */
  const completeOnboarding = useCallback(
    (target: Href) => {
      if (role && isTutorialRole(role)) setOnboardingCompleted(role, true);
      const { token, user } = useAuthStore.getState();
      if (!token || !user) {
        router.replace(target);
        return;
      }
      void offerBiometricEnrollment(token, user, () => router.replace(target), (message) => {
        toast('Activation impossible', { message, type: 'error' });
      });
    },
    [role, router, setOnboardingCompleted, toast],
  );

  const finish = useCallback(
    async (target: Href | null) => {
      if (!target) return;
      if (isReplay) {
        router.replace(target);
        return;
      }
      if (await shouldExplainPushPermission()) {
        setPushTarget(target);
        return;
      }
      completeOnboarding(target);
    },
    [completeOnboarding, isReplay, router],
  );

  const scrollTo = useCallback(
    (next: number) => {
      listRef.current?.scrollToIndex({ index: next, animated: !reducedMotion });
      setIndex(next);
    },
    [reducedMotion],
  );

  const finishAtHome = useCallback(() => {
    void finish(roleHomeOrNull(role));
  }, [finish, role]);

  const goNext = useCallback(() => {
    if (isLast) {
      finishAtHome();
      return;
    }
    scrollTo(index + 1);
  }, [finishAtHome, index, isLast, scrollTo]);

  const goPrev = useCallback(() => {
    if (index <= 0) return;
    scrollTo(index - 1);
  }, [index, scrollTo]);

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / layout.width);
      setIndex(Math.max(0, Math.min(nextIndex, lastIndex)));
    },
    [lastIndex, layout.width],
  );

  if (!config || slides.length === 0) {
    return null;
  }

  if (pushTarget) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <PushPermissionPrompt isPatient={isPatient} onDone={() => completeOnboarding(pushTarget)} />
        </SafeAreaView>
      </View>
    );
  }

  const showBookingCta = isPatient && isLast && !isReplay;
  const kicker = firstName ? `${config.welcomeTitle}, ${firstName}` : config.welcomeTitle;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Row align="center" justify="between" style={styles.topBar}>
          <AppText style={styles.kicker}>{kicker}</AppText>
          <Button title="Passer" variant="ghost" onPress={finishAtHome} />
        </Row>

        <View
          style={styles.carouselHost}
          onLayout={(event) => {
            const next = event.nativeEvent.layout.height;
            if (next > 0) setSlideHeight(next);
          }}
        >
          <FlatList
            key={layout.width}
            ref={listRef}
            initialScrollIndex={index}
            data={slides}
            extraData={listExtraData}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumScrollEnd}
            getItemLayout={(_, i) => ({ length: layout.width, offset: layout.width * i, index: i })}
            style={styles.carouselList}
            renderItem={({ item, index: slideIndex }) => (
              <ScrollView
                style={{ width: layout.width, height: slideHeight }}
                contentContainerStyle={styles.slidePage}
                accessibilityElementsHidden={slideIndex !== index}
                importantForAccessibility={slideIndex === index ? 'auto' : 'no-hide-descendants'}
              >
                <View style={[styles.slideCenter, { maxWidth: layout.contentMaxWidth }]}>
                  <View style={[styles.illustration, { height: illustrationHeight }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                    <TutorialIllustration illustration={item.illustration} role={config.role} />
                  </View>
                  <View style={styles.copy}>
                    <AppText accessibilityRole="header" style={styles.title}>{item.title}</AppText>
                    <AppText style={styles.body}>{item.body}</AppText>
                  </View>
                </View>
              </ScrollView>
            )}
          />
        </View>

        <View style={styles.footer}>
          <View
            accessible
            accessibilityLabel={`Étape ${index + 1} sur ${slides.length}`}
            accessibilityLiveRegion="polite"
          >
            <Row justify="center" gap={spacing[1.5]} style={styles.dots}>
              {slides.map((slide, dotIndex) => (
                <View
                  key={slide.id}
                  style={[styles.dot, dotIndex === index ? styles.dotActive : styles.dotIdle]}
                />
              ))}
            </Row>
          </View>

          {showBookingCta ? (
            <View style={styles.finalActions}>
              <Button
                title="Réserver ma première visite"
                fullWidth
                size="lg"
                onPress={() => void finish(PATIENT_BOOKING_HREF)}
              />
              <Row gap={spacing[3]}>
                <View style={styles.actionFlex}>
                  <Button title="Précédent" variant="ghost" fullWidth onPress={goPrev} />
                </View>
                <View style={styles.actionFlex}>
                  <Button title="Plus tard" variant="ghost" fullWidth onPress={finishAtHome} />
                </View>
              </Row>
            </View>
          ) : (
            <Row gap={spacing[3]} style={styles.actions}>
              {index > 0 ? (
                <View style={styles.actionFlex}>
                  <Button title="Précédent" variant="ghost" size="lg" fullWidth onPress={goPrev} />
                </View>
              ) : null}
              <View style={styles.actionFlex}>
                <Button
                  title={isLast ? (isReplay ? 'Terminer' : 'Commencer') : 'Suivant'}
                  fullWidth
                  size="lg"
                  onPress={goNext}
                />
              </View>
            </Row>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    root: {
    minWidth: 0, flex: 1, backgroundColor: c.background },
    safe: {
    minWidth: 0, flex: 1 },
    topBar: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[2],
      paddingBottom: spacing[1],
    },
    kicker: {
      flex: 1,
      minWidth: 0,
      ...font.bold,
      fontSize: fontSize.sm,
      color: c.primaryDark,
      letterSpacing: 0.2,
    },
    illustration: { width: '100%' as const, minWidth: 0 },
    carouselHost: {
      minWidth: 0,
      flex: 1,
      minHeight: 0,
    },
    carouselList: {
      minWidth: 0,
      flex: 1,
    },
    slidePage: {
      minWidth: 0,
      flexGrow: 1,
      paddingVertical: spacing[4],
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing[4],
    },
    slideCenter: {
      width: '100%' as const,
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
      ...font.heading,
      fontSize: fontSize.xl,
      color: c.textPrimary,
      letterSpacing: -0.4,
      lineHeight: fontSize.xl * 1.15,
      textAlign: 'center' as const,
    },
    body: {
      ...font.regular,
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
    dotActive: { width: 24, backgroundColor: c.primary },
    dotIdle: { width: 8, backgroundColor: c.border },
    actions: { alignItems: 'stretch' as const },
    finalActions: { gap: spacing[2] },
    actionFlex: { flex: 1, minWidth: 0 },
  };
}

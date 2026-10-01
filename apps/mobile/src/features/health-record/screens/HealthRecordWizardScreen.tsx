import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { getErrorMessage } from '@/lib/errors/handle-api-error';
import { FormScreen } from '@/components/layout/FormScreen';
import { SkeletonList } from '@/components/ui/skeletons';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useStackContentTopInset, useStackScrollConfig, STACK_SCENE_CONTENT_TOP_GAP } from '@/navigation/use-stack-scroll-config';
import { spreadTabSceneScrollProps } from '@/components/navigation/liquid-glass-header-inset';
import { Row } from '@/components/layout/primitives';
import { HealthRecordSectionEmoji } from '../components/HealthRecordSectionEmoji';
import { HealthRecordQuestionStep } from '../components/HealthRecordQuestionStep';
import { useHealthRecordWizard } from '../hooks/use-health-record-wizard';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';

function normalizeRouteParam(value?: string | string[]): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
    return value[0].trim();
  }
  return undefined;
}

export function HealthRecordWizardScreen() {
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const [failedAnswer, setFailedAnswer] = useState<{ key: string; value: unknown; error: unknown } | null>(null);
  const { section, question } = useLocalSearchParams<{ section?: string | string[]; question?: string | string[] }>();
  const sectionId = normalizeRouteParam(section);
  const questionKey = normalizeRouteParam(question);
  const wizard = useHealthRecordWizard(sectionId, questionKey);
  const scrollConfig = useStackScrollConfig(styles.content, {
    extraTop: STACK_SCENE_CONTENT_TOP_GAP,
  });
  const contentTopInset = useStackContentTopInset();

  if (wizard.loading) {
    return (
      <StackChromeScreen>
        <View style={[styles.loading, { paddingTop: contentTopInset }]}>
          <SkeletonList count={3} />
        </View>
      </StackChromeScreen>
    );
  }

  if (wizard.error) {
    return (
      <StackChromeScreen>
        <View style={[styles.errorWrap, { paddingTop: contentTopInset }]}>
          <ErrorState
            title="Carnet indisponible"
            error={wizard.error}
            onRetry={() => void wizard.refetch()}
          />
        </View>
      </StackChromeScreen>
    );
  }

  if (!wizard.current || wizard.questions.length === 0) {
    const sectionEdit = wizard.isSectionEdit;
    return (
      <StackChromeScreen>
        <View style={[styles.errorWrap, { paddingTop: contentTopInset }]}>
          <EmptyState
            title={sectionEdit ? 'Section indisponible' : 'Carnet à jour'}
            description={
              sectionEdit
                ? 'Cette section ne contient pas de questions pour votre profil.'
                : 'Toutes les informations essentielles sont renseignées.'
            }
            actionLabel="Retour au récap"
            onAction={() => router.replace('/(patient)/health-record' as never)}
          />
        </View>
      </StackChromeScreen>
    );
  }

  const current = wizard.current;
  const isLast = wizard.stepIndex >= wizard.questions.length - 1;
  const goToRecap = () => router.replace('/(patient)/health-record' as never);

  const submit = async (key: string, value: unknown) => {
    setFailedAnswer(null);
    try {
      await wizard.submitAnswer(key, value);
      if (isLast) goToRecap();
    } catch (error) {
      setFailedAnswer({ key, value, error });
    }
  };

  return (
    <StackChromeScreen>
      <FormScreen
        {...spreadTabSceneScrollProps(scrollConfig)}
        contentContainerStyle={scrollConfig.contentContainerStyle}
        keyboardShouldPersistTaps="handled"
      >
        {wizard.sectionLabel ? (
          <Row gap={spacing[2]} align="center" style={styles.sectionRow}>
            {wizard.sectionId ? (
              <HealthRecordSectionEmoji sectionId={wizard.sectionId} size="lg" />
            ) : null}
            <AppText style={styles.section}>{wizard.sectionLabel}</AppText>
          </Row>
        ) : null}
        <AppText style={styles.step}>
          Question {wizard.stepIndex + 1} / {wizard.questions.length}
        </AppText>
        <View
          style={styles.progressTrack}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: wizard.questions.length, now: wizard.stepIndex + 1 }}
        >
          <View style={[styles.progressFill, { width: `${Math.round(wizard.progress * 100)}%` }]} />
        </View>

        {failedAnswer && failedAnswer.key === current.key ? (
          <View style={styles.saveError} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <AppText style={styles.saveErrorTitle}>Réponse non enregistrée</AppText>
            <AppText style={styles.saveErrorText}>
              {getErrorMessage(failedAnswer.error, 'Vérifiez votre connexion puis réessayez.')}
            </AppText>
            <Button
              title="Réessayer"
              variant="outline"
              size="sm"
              loading={wizard.saving}
              onPress={() => void submit(failedAnswer.key, failedAnswer.value)}
            />
          </View>
        ) : null}

        <Animated.View entering={FadeInDown.duration(280)}>
          <HealthRecordQuestionStep
            key={current.key}
            question={current}
            initialValue={wizard.currentInitialValue}
            saving={wizard.saving}
            onAnswer={(value) => void submit(current.key, value)}
            onSkip={() => {
              setFailedAnswer(null);
              wizard.advanceStep();
              if (isLast) goToRecap();
            }}
          />
        </Animated.View>

        {wizard.stepIndex > 0 ? (
          <Button
            title="Retour"
            variant="ghost"
            onPress={() => {
              setFailedAnswer(null);
              wizard.goBack();
            }}
            disabled={wizard.saving}
            style={styles.backBtn}
          />
        ) : null}
      </FormScreen>
    </StackChromeScreen>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    loading: {
    minWidth: 0, flex: 1, padding: spacing[4] },
    errorWrap: {
    minWidth: 0, flex: 1, padding: spacing[4], justifyContent: 'center' as const },
    content: { paddingHorizontal: spacing[4], paddingBottom: spacing[8] },
    sectionRow: {
      marginBottom: spacing[1],
    },
    section: {
      flex: 1,
      minWidth: 0,
      ...font.semiBold,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.6,
      marginBottom: spacing[1],
    },
    step: {
      ...font.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      marginBottom: spacing[2],
    },
    progressTrack: {
      height: 4,
      borderRadius: radius.full,
      backgroundColor: c.borderLight,
      overflow: 'hidden' as const,
      marginBottom: spacing[5],
    },
    progressFill: {
      height: 4,
      borderRadius: radius.full,
      backgroundColor: c.primary,
    },
    saveError: {
      gap: spacing[2],
      padding: spacing[3],
      marginBottom: spacing[4],
      borderRadius: radius.md,
      backgroundColor: c.errorLight,
    },
    saveErrorTitle: {
      ...font.semiBold,
      fontSize: fontSize.sm,
      color: c.error,
    },
    saveErrorText: {
      ...font.regular,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    backBtn: { marginTop: spacing[4] },
  };
}

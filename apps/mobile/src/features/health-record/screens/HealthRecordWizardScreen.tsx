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
import { Row } from '@/components/layout/primitives';
import { HealthRecordSectionIcon } from '../components/HealthRecordSectionIcon';
import { HealthRecordQuestionStep } from '../components/HealthRecordQuestionStep';
import { useHealthRecordWizard } from '../hooks/use-health-record-wizard';
import { ArrowLeft } from 'lucide-react-native';
import {
  AppText,
  ICON_STROKE_WIDTH,
  iconSize,
  radius,
  spacing,
  useAppColors,
  useStyles,
  type Theme,
} from '@/theme';

function normalizeRouteParam(value?: string | string[]): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
    return value[0].trim();
  }
  return undefined;
}

export function HealthRecordWizardScreen() {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const [failedAnswer, setFailedAnswer] = useState<{ key: string; value: unknown; error: unknown } | null>(null);
  const { section, question } = useLocalSearchParams<{ section?: string | string[]; question?: string | string[] }>();
  const sectionId = normalizeRouteParam(section);
  const questionKey = normalizeRouteParam(question);
  const wizard = useHealthRecordWizard(sectionId, questionKey);

  if (wizard.loading) {
    return (
      <StackChromeScreen>
        <View style={[styles.loading, { paddingTop: spacing[3] }]}>
          <SkeletonList count={3} />
        </View>
      </StackChromeScreen>
    );
  }

  if (wizard.error) {
    return (
      <StackChromeScreen>
        <View style={[styles.errorWrap, { paddingTop: spacing[3] }]}>
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
        <View style={[styles.errorWrap, { paddingTop: spacing[3] }]}>
          <EmptyState
            illustration={sectionEdit ? 'health-record' : 'success'}
            title={sectionEdit ? 'Aucune question ici' : 'Carnet à jour'}
            description={
              sectionEdit
                ? 'Cette section ne concerne pas votre profil.'
                : 'Les informations essentielles sont renseignées.'
            }
            actionLabel="Voir mon carnet"
            onAction={() => router.replace('/(patient)/health-record')}
          />
        </View>
      </StackChromeScreen>
    );
  }

  const current = wizard.current;
  const isLast = wizard.stepIndex >= wizard.questions.length - 1;
  const goToRecap = () => router.replace('/(patient)/health-record');

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
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Row gap={spacing[2]} align="center" style={styles.sectionRow}>
          {wizard.sectionId ? <HealthRecordSectionIcon sectionId={wizard.sectionId} /> : null}
          <AppText variant="caption" style={styles.section}>
            {[wizard.sectionLabel, `Question ${wizard.stepIndex + 1} sur ${wizard.questions.length}`]
              .filter(Boolean)
              .join(' · ')}
          </AppText>
        </Row>
        <View
          style={styles.progressTrack}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: wizard.questions.length, now: wizard.stepIndex + 1 }}
        >
          <View style={[styles.progressFill, { width: `${Math.round(wizard.progress * 100)}%` }]} />
        </View>
        {wizard.stepIndex === 0 ? (
          <AppText variant="caption" style={styles.optionalHint}>
            Toutes les questions sont facultatives.
          </AppText>
        ) : null}

        {failedAnswer && failedAnswer.key === current.key ? (
          <View style={styles.saveError} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <AppText variant="headline" style={styles.saveErrorTitle}>
              Réponse non enregistrée
            </AppText>
            <AppText variant="secondary">
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
            title="Question précédente"
            variant="ghost"
            leftIcon={<ArrowLeft size={iconSize.sm} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />}
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

function buildStyles({ colors: c }: Theme) {
  return {
    loading: { minWidth: 0, flex: 1, padding: spacing[4] },
    errorWrap: { minWidth: 0, flex: 1, padding: spacing[4], justifyContent: 'center' as const },
    content: { paddingTop: spacing[3], paddingHorizontal: spacing[4], paddingBottom: spacing[8] },
    sectionRow: { marginBottom: spacing[2] },
    section: { flex: 1, minWidth: 0, color: c.textSecondary },
    optionalHint: { color: c.textSecondary, marginTop: -spacing[3], marginBottom: spacing[5] },
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
    saveErrorTitle: { color: c.error },
    backBtn: { marginTop: spacing[4] },
  };
}

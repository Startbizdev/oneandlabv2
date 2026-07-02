import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormScreen } from '@/components/layout/FormScreen';
import { SkeletonList } from '@/components/ui/skeletons';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useStackContentTopInset, useStackScrollConfig, STACK_SCENE_CONTENT_TOP_GAP } from '@/navigation/use-stack-scroll-config';
import { spreadTabSceneScrollProps } from '@/components/navigation/liquid-glass-header-inset';
import { Row } from '@/components/layout/primitives';
import { HealthRecordSectionEmoji } from '../components/HealthRecordSectionEmoji';
import { HealthRecordQuestionStep } from '../components/HealthRecordQuestionStep';
import { useHealthRecordWizard } from '../hooks/use-health-record-wizard';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

function normalizeRouteParam(value?: string | string[]): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
    return value[0].trim();
  }
  return undefined;
}

export function HealthRecordWizardScreen() {
  const styles = useThemedStyles(buildStyles, 'HealthRecordWizardScreen');
  const router = useRouter();
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
          <EmptyState
            title="Carnet indisponible"
            description={wizard.error instanceof Error ? wizard.error.message : 'Réessayez plus tard.'}
            actionLabel="Réessayer"
            onAction={() => void wizard.refetch()}
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
            <Text style={styles.section}>{wizard.sectionLabel}</Text>
          </Row>
        ) : null}
        <Text style={styles.step}>
          Question {wizard.stepIndex + 1} / {wizard.questions.length}
        </Text>

        <Animated.View entering={FadeInDown.duration(280)}>
          <HealthRecordQuestionStep
            key={wizard.current.key}
            question={wizard.current}
            initialValue={wizard.currentInitialValue}
            saving={wizard.saving}
            onAnswer={(value) => {
              const isLast = wizard.stepIndex >= wizard.questions.length - 1;
              void wizard.submitAnswer(wizard.current!.key, value).then(() => {
                if (isLast) {
                  router.replace('/(patient)/health-record' as never);
                }
              });
            }}
            onSkip={() => {
              const isLast = wizard.stepIndex >= wizard.questions.length - 1;
              wizard.advanceStep();
              if (isLast) {
                router.replace('/(patient)/health-record' as never);
              }
            }}
          />
        </Animated.View>

        {wizard.stepIndex > 0 ? (
          <Button
            title="Retour"
            variant="ghost"
            onPress={wizard.goBack}
            disabled={wizard.saving}
            style={styles.backBtn}
          />
        ) : null}
      </FormScreen>
    </StackChromeScreen>
  );
}

function buildStyles(c: AppColors) {
  return {
    loading: { flex: 1, padding: spacing[4] },
    errorWrap: { flex: 1, padding: spacing[4], justifyContent: 'center' as const },
    content: { paddingHorizontal: spacing[4], paddingBottom: spacing[8] },
    sectionRow: {
      marginBottom: spacing[1],
    },
    section: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.6,
      marginBottom: spacing[1],
    },
    step: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      marginBottom: spacing[5],
    },
    backBtn: { marginTop: spacing[4] },
  };
}

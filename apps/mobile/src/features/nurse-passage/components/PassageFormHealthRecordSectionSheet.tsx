import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/skeletons';
import {
  fetchStaffHealthRecord,
  patchStaffHealthRecordAnswers,
} from '@/features/health-record/api/health-record.service';
import { HealthRecordQuestionStep } from '@/features/health-record/components/HealthRecordQuestionStep';
import { healthRecordQueryKeys } from '@/features/health-record/hooks/use-health-record-completion';
import { recapItemsToQuestions } from '@/features/health-record/utils/health-record-questions';
import { spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type Props = {
  visible: boolean;
  patientId: string;
  sectionId: string | null;
  onClose: () => void;
};

export function PassageFormHealthRecordSectionSheet({
  visible,
  patientId,
  sectionId,
  onClose,
}: Props) {
  const styles = useThemedStyles(buildStyles);
  const qc = useQueryClient();
  const [stepIndex, setStepIndex] = useState(0);

  const recapQ = useQuery({
    queryKey: healthRecordQueryKeys.staffRecap(patientId),
    queryFn: () => fetchStaffHealthRecord(patientId),
    enabled: visible && Boolean(patientId),
  });

  const section = useMemo(
    () => recapQ.data?.sections.find((s) => s.id === sectionId) ?? null,
    [recapQ.data?.sections, sectionId],
  );

  const questions = useMemo(
    () => recapItemsToQuestions(section?.items),
    [section?.items],
  );

  const current = questions[stepIndex] ?? null;

  const savedAnswers = useMemo(() => {
    const map: Record<string, unknown> = {};
    for (const sec of recapQ.data?.sections ?? []) {
      for (const item of sec.items ?? []) {
        if (item.key) map[item.key] = item.value;
      }
    }
    return map;
  }, [recapQ.data?.sections]);

  useEffect(() => {
    if (visible) setStepIndex(0);
  }, [visible, sectionId]);

  const saveMut = useMutation({
    mutationFn: (payload: Record<string, { value: unknown }>) =>
      patchStaffHealthRecordAnswers(patientId, payload),
    onSuccess: (data) => {
      qc.setQueryData(healthRecordQueryKeys.staffRecap(patientId), data);
    },
  });

  const handleAnswer = async (value: unknown) => {
    if (!current) return;
    await saveMut.mutateAsync({ [current.key]: { value } });
    if (stepIndex < questions.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      onClose();
    }
  };

  const title = section?.label_fr ?? 'Carnet de santé';

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      snapPoints={['88%']}
      footer={
        current && stepIndex > 0 ? (
          <Button
            title="Question précédente"
            variant="secondary"
            onPress={() => setStepIndex((i) => Math.max(0, i - 1))}
          />
        ) : undefined
      }
    >
      {recapQ.isLoading ? (
        <SkeletonList count={3} itemHeight={48} gap={spacing[2]} />
      ) : recapQ.isError ? (
        <EmptyState
          title="Carnet indisponible"
          description={
            recapQ.error instanceof Error ? recapQ.error.message : 'Impossible de charger le carnet.'
          }
          actionLabel="Fermer"
          onAction={onClose}
        />
      ) : !current ? (
        <AppText style={styles.empty}>Aucune question dans cette section.</AppText>
      ) : (
        <View style={styles.body}>
          <AppText style={styles.progress}>
            Question {stepIndex + 1} / {questions.length}
          </AppText>
          <HealthRecordQuestionStep
            key={current.key}
            question={current}
            initialValue={savedAnswers[current.key]}
            onAnswer={(value) => void handleAnswer(value)}
            onSkip={() => {
              if (stepIndex < questions.length - 1) setStepIndex((i) => i + 1);
              else onClose();
            }}
            saving={saveMut.isPending}
          />
        </View>
      )}
    </BottomSheet>
  );
}

function buildStyles(c: AppColors) {
  return {
    body: { gap: spacing[3], paddingBottom: spacing[4] },
    progress: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.4,
    },
    empty: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      paddingBottom: spacing[4],
    },
  };
}

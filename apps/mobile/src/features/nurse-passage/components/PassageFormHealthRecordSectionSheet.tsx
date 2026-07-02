import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { SkeletonList } from '@/components/ui/skeletons';
import {
  fetchHealthRecordSchema,
  fetchStaffHealthRecord,
  patchStaffHealthRecordAnswers,
} from '@/features/health-record/api/health-record.service';
import { HealthRecordQuestionStep } from '@/features/health-record/components/HealthRecordQuestionStep';
import { healthRecordQueryKeys } from '@/features/health-record/hooks/use-health-record-completion';
import { spacing } from '@/theme';
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

  const schemaQ = useQuery({
    queryKey: healthRecordQueryKeys.schema,
    queryFn: fetchHealthRecordSchema,
    enabled: visible,
  });

  const recapQ = useQuery({
    queryKey: healthRecordQueryKeys.staffRecap(patientId),
    queryFn: () => fetchStaffHealthRecord(patientId),
    enabled: visible && Boolean(patientId),
  });

  const section = useMemo(
    () => schemaQ.data?.sections.find((s) => s.id === sectionId) ?? null,
    [schemaQ.data?.sections, sectionId],
  );

  const questions = section?.questions ?? [];
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
          <Button title="Question précédente" variant="secondary" onPress={() => setStepIndex((i) => Math.max(0, i - 1))} />
        ) : undefined
      }
    >
      {schemaQ.isLoading || recapQ.isLoading ? (
        <SkeletonList count={3} itemHeight={48} gap={spacing[2]} />
      ) : !current ? (
        <Text style={styles.empty}>Aucune question dans cette section.</Text>
      ) : (
        <View style={styles.body}>
          <Text style={styles.progress}>
            Question {stepIndex + 1} / {questions.length}
          </Text>
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

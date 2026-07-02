import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchHealthRecordCompletion,
  fetchHealthRecordRecap,
  fetchHealthRecordSchema,
  patchHealthRecordAnswers,
  type HealthRecordQuestion,
  type HealthRecordSection,
} from '../api/health-record.service';
import { healthRecordQueryKeys } from './use-health-record-completion';
import { recapItemsToQuestions } from '../utils/health-record-questions';

function flattenQuestions(sections: HealthRecordSection[]): HealthRecordQuestion[] {
  const out: HealthRecordQuestion[] = [];
  for (const section of sections) {
    for (const q of section.questions ?? []) {
      if (q?.key) {
        out.push({ ...q, ...(q as HealthRecordQuestion) });
      }
    }
  }
  return out;
}

function isAnswered(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'string' && value.trim().toLowerCase() === 'null') return false;
  return true;
}

export function useHealthRecordWizard(sectionFilter?: string, questionKey?: string) {
  const qc = useQueryClient();
  const schemaQ = useQuery({
    queryKey: healthRecordQueryKeys.schema,
    queryFn: fetchHealthRecordSchema,
  });
  const completionQ = useQuery({
    queryKey: healthRecordQueryKeys.completion,
    queryFn: fetchHealthRecordCompletion,
  });
  const recapQ = useQuery({
    queryKey: healthRecordQueryKeys.recap,
    queryFn: fetchHealthRecordRecap,
  });

  const [stepIndex, setStepIndex] = useState(0);
  const [localAnswers, setLocalAnswers] = useState<Record<string, unknown>>({});

  const savedAnswers = useMemo(() => {
    const map: Record<string, unknown> = {};
    for (const section of recapQ.data?.sections ?? []) {
      for (const item of section.items ?? []) {
        if (item.key) {
          map[item.key] = item.value;
        }
      }
    }
    return { ...map, ...localAnswers };
  }, [recapQ.data, localAnswers]);

  const recapQuestions = useMemo(() => {
    if (!sectionFilter) return [];
    const section = recapQ.data?.sections.find((s) => s.id === sectionFilter);
    return recapItemsToQuestions(section?.items);
  }, [recapQ.data?.sections, sectionFilter]);

  const questions = useMemo(() => {
    const sections = schemaQ.data?.sections ?? [];
    const filteredSections = sectionFilter
      ? sections.filter((s) => s.id === sectionFilter)
      : sections;
    const schemaQuestions = flattenQuestions(filteredSections);
    if (schemaQuestions.length > 0) return schemaQuestions;
    return recapQuestions;
  }, [schemaQ.data, sectionFilter, recapQuestions]);

  const sectionMeta = useMemo(() => {
    if (!sectionFilter) return null;
    const fromSchema = schemaQ.data?.sections.find((s) => s.id === sectionFilter);
    if (fromSchema) return fromSchema;
    const fromRecap = recapQ.data?.sections.find((s) => s.id === sectionFilter);
    if (!fromRecap) return null;
    return {
      id: fromRecap.id,
      label_fr: fromRecap.label_fr,
      questions: recapQuestions,
    };
  }, [schemaQ.data, recapQ.data, sectionFilter, recapQuestions]);

  useEffect(() => {
    if (!questionKey || questions.length === 0) {
      setStepIndex(0);
      return;
    }
    const idx = questions.findIndex((q) => q.key === questionKey);
    setStepIndex(idx >= 0 ? idx : 0);
  }, [questionKey, sectionFilter, questions]);

  const current = questions[stepIndex] ?? null;
  const sectionLabel = useMemo(() => {
    if (sectionMeta?.label_fr) return sectionMeta.label_fr;
    if (!current || !schemaQ.data) return '';
    const sec = schemaQ.data.sections.find((s) =>
      s.questions.some((q) => q.key === current.key),
    );
    return sec?.label_fr ?? '';
  }, [current, schemaQ.data, sectionMeta]);

  const sectionId = useMemo(() => {
    if (sectionFilter) return sectionFilter;
    if (!current || !schemaQ.data) return '';
    const sec = schemaQ.data.sections.find((s) =>
      s.questions.some((q) => q.key === current.key),
    );
    return sec?.id ?? '';
  }, [current, schemaQ.data, sectionFilter]);

  const progress = questions.length > 0 ? (stepIndex + 1) / questions.length : 1;

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, { value: unknown }>) => patchHealthRecordAnswers(payload),
    onSuccess: (data) => {
      qc.setQueryData(healthRecordQueryKeys.recap, data);
      qc.setQueryData(healthRecordQueryKeys.completion, data.completion);
    },
  });

  const submitAnswer = useCallback(
    async (key: string, value: unknown) => {
      setLocalAnswers((prev) => ({ ...prev, [key]: value }));
      await saveMutation.mutateAsync({ [key]: { value } });
      if (stepIndex < questions.length - 1) {
        setStepIndex((i) => i + 1);
      }
    },
    [questions.length, saveMutation, stepIndex],
  );

  const goBack = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const advanceStep = useCallback(() => {
    if (stepIndex < questions.length - 1) {
      setStepIndex((i) => i + 1);
    }
  }, [questions.length, stepIndex]);

  const currentInitialValue = current ? savedAnswers[current.key] : undefined;

  const isComplete =
    questions.length === 0
      ? true
      : current != null &&
        stepIndex >= questions.length - 1 &&
        isAnswered(localAnswers[current.key]);

  return {
    loading: schemaQ.isLoading || completionQ.isLoading || recapQ.isLoading,
    error: schemaQ.error ?? completionQ.error ?? recapQ.error,
    questions,
    current,
    stepIndex,
    sectionLabel,
    sectionId,
    progress,
    submitAnswer,
    advanceStep,
    goBack,
    currentInitialValue,
    saving: saveMutation.isPending,
    isComplete,
    isSectionEdit: Boolean(sectionFilter),
    missingCount: completionQ.data?.missing_count ?? questions.length,
    refetch: () => Promise.all([schemaQ.refetch(), completionQ.refetch(), recapQ.refetch()]),
  };
}

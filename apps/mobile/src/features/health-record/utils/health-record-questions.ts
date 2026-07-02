import type {
  HealthRecordQuestion,
  HealthRecordQuestionType,
  HealthRecordRecapItem,
} from '../api/health-record.service';

export function recapItemsToQuestions(items: HealthRecordRecapItem[] | undefined): HealthRecordQuestion[] {
  return (items ?? [])
    .filter((item) => item?.key)
    .map((item) => ({
      key: item.key,
      label_fr: item.label_fr?.trim() || item.key,
      type: (item.type ?? 'text') as HealthRecordQuestionType,
      optional: item.optional ?? true,
      options: item.options,
      placeholder: item.placeholder,
    }));
}

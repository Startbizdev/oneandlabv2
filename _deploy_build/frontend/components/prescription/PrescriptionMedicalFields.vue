<template>
  <div class="space-y-4">
    <UFormField :label="MEDICAL_PRESCRIPTION_ALD_LABEL" name="ald_prescription">
      <UTextarea
        v-model="ald"
        :placeholder="MEDICAL_PRESCRIPTION_FIELD_PLACEHOLDER"
        :rows="5"
        class="font-mono text-sm w-full"
      />
    </UFormField>
    <UFormField :label="MEDICAL_PRESCRIPTION_HORS_ALD_LABEL" name="hors_ald_prescription">
      <UTextarea
        v-model="horsAld"
        :placeholder="MEDICAL_PRESCRIPTION_FIELD_PLACEHOLDER"
        :rows="5"
        class="font-mono text-sm w-full"
      />
    </UFormField>
  </div>
</template>

<script setup lang="ts">
import {
  MEDICAL_PRESCRIPTION_ALD_LABEL,
  MEDICAL_PRESCRIPTION_FIELD_PLACEHOLDER,
  MEDICAL_PRESCRIPTION_HORS_ALD_LABEL,
  composeMedicalPrescriptionText,
  hasMedicalPrescriptionContent,
  parseMedicalPrescriptionText,
  type MedicalPrescriptionFields,
} from '@oneandlab/shared-utils';

const props = defineProps<{
  modelValue?: MedicalPrescriptionFields | string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: MedicalPrescriptionFields];
}>();

function fieldsFromModel(): MedicalPrescriptionFields {
  const raw = props.modelValue;
  if (typeof raw === 'string') {
    return parseMedicalPrescriptionText(raw);
  }
  return {
    ald: raw?.ald ?? '',
    horsAld: raw?.horsAld ?? '',
  };
}

const ald = ref(fieldsFromModel().ald);
const horsAld = ref(fieldsFromModel().horsAld);

watch(
  () => props.modelValue,
  (v) => {
    const next = typeof v === 'string' ? parseMedicalPrescriptionText(v) : { ald: v?.ald ?? '', horsAld: v?.horsAld ?? '' };
    if (next.ald !== ald.value) ald.value = next.ald;
    if (next.horsAld !== horsAld.value) horsAld.value = next.horsAld;
  },
);

watch([ald, horsAld], () => {
  emit('update:modelValue', { ald: ald.value, horsAld: horsAld.value });
});

defineExpose({
  getFields: (): MedicalPrescriptionFields => ({ ald: ald.value, horsAld: horsAld.value }),
  getComposedText: () => composeMedicalPrescriptionText({ ald: ald.value, horsAld: horsAld.value }),
  hasContent: () => hasMedicalPrescriptionContent({ ald: ald.value, horsAld: horsAld.value }),
});
</script>

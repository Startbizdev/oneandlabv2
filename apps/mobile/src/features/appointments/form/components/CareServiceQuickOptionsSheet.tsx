import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { FilterOptionChips } from '@/components/ui/FilterOptionChips';
import {
  NURSING_DURATION_OPTIONS,
  NURSING_FREQUENCY_OPTIONS,
  showNursingFrequency,
  careAutreDetailKey,
  categorySelectHasAutreOption,
  isAutreSelectValue,
  stripOrphanAutreDetailKeys,
} from '@oneandlab/shared-constants';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import type { SelectedServiceInput } from '@oneandlab/shared-utils';
import { SheetModal } from '@/components/ui/SheetModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { CareCategory, CareCategoryOption } from '@/features/categories/api/categories.service';
import type { BookingServiceFormSlice } from '../utils/booking-service-form-slice';
import { resolveRdvCareDisplayLabel } from '@/utils/rdv-care-display-label';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';

const BLOOD_TEST_TYPE_OPTIONS = [
  { label: 'Une seule fois', value: 'single' },
  { label: 'Plusieurs prélèvements sur plusieurs jours', value: 'multiple' },
];

const MULTIPLE_DAYS_OPTIONS = [
  { label: '2 jours', value: '2' },
  { label: '3 jours', value: '3' },
  { label: '5 jours', value: '5' },
  { label: '7 jours', value: '7' },
  { label: '10 jours', value: '10' },
  { label: '15 jours', value: '15' },
  { label: 'Personnalisé', value: 'custom' },
];

interface Props {
  visible: boolean;
  category: CareCategory | null;
  categories: CareCategory[];
  onlyCategoryOptions: boolean;
  /** Contenu inline dans un sheet parent (pas de second bottom sheet). */
  embedded?: boolean;
  /** Libellé du bouton de confirmation (défaut : « Valider et ajouter »). */
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (payload: { service: SelectedServiceInput; slice: BookingServiceFormSlice }) => void;
}

function OptionSelect({
  label,
  required,
  items,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  items: Array<{ label: string; value: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.field}>
      <AppText variant="headline">
        {label}
        {required ? ' *' : ''}
      </AppText>
      <FilterOptionChips options={items} value={value} onChange={onChange} />
    </View>
  );
}

export function CareServiceQuickOptionsSheet({
  visible,
  category,
  categories,
  onlyCategoryOptions,
  embedded = false,
  confirmLabel = 'Valider et ajouter',
  onClose,
  onConfirm,
}: Props) {
  const styles = useStyles(buildStyles);
  const [localError, setLocalError] = useState('');
  const [careOptions, setCareOptions] = useState<Record<string, string | number>>({});
  const [bloodTestType, setBloodTestType] = useState('single');
  const [durationDays, setDurationDays] = useState('1');
  const [customDays, setCustomDays] = useState('');
  const [frequency, setFrequency] = useState('');

  const sortedCategoryOptions = useMemo((): CareCategoryOption[] => {
    if (!category) return [];
    const cat = categories.find((c) => String(c.id) === String(category.id));
    const opts = cat?.options ?? category.options ?? [];
    return [...opts].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [category, categories]);

  const showBloodSchedulingFields =
    category != null && isBloodTestAppointment(category.type) && !onlyCategoryOptions;

  const showNursingCommonFields =
    category != null && isNursingAppointment(category.type) && !onlyCategoryOptions;

  const categoryId = category?.id ?? null;

  useEffect(() => {
    if (!visible || categoryId === null) return;
    setLocalError('');
    const next: Record<string, string | number> = {};
    for (const o of sortedCategoryOptions) {
      next[o.option_key] = o.field_type === 'number' ? 0 : '';
    }
    setCareOptions(next);
    setBloodTestType('single');
    setDurationDays('1');
    setCustomDays('');
    setFrequency('');
  }, [visible, categoryId, sortedCategoryOptions]);

  const setCareOpt = useCallback(
    (key: string, value: string | number) => {
      setCareOptions((prev) => {
        const next = { ...prev, [key]: value };
        for (const o of sortedCategoryOptions) {
          if (o.field_type === 'select' && !isAutreSelectValue(next[o.option_key])) {
            const dk = careAutreDetailKey(o.option_key);
            if (next[dk] !== undefined) delete next[dk];
          }
        }
        return next;
      });
    },
    [sortedCategoryOptions],
  );

  const validate = (): string | null => {
    if (!category) return 'Soin invalide';

    for (const o of sortedCategoryOptions) {
      if (!o.is_required) continue;
      const v = careOptions[o.option_key];
      if (v === '' || v === undefined || v === null) return `« ${o.label} » obligatoire`;
    }

    for (const o of sortedCategoryOptions) {
      if (o.field_type !== 'select' || !categorySelectHasAutreOption(o)) continue;
      if (!isAutreSelectValue(careOptions[o.option_key])) continue;
      const dk = careAutreDetailKey(o.option_key);
      const d = careOptions[dk];
      if (d === '' || d === undefined || d === null || String(d).trim() === '') {
        return `« ${o.label} » : précisez votre choix (Autre)`;
      }
    }

    if (showBloodSchedulingFields) {
      if (!bloodTestType) return 'Type de prélèvement obligatoire';
      if (bloodTestType === 'multiple') {
        if (!durationDays) return 'Nombre de jours obligatoire';
        if (durationDays === 'custom' && (!customDays || Number(customDays) < 1)) {
          return 'Nombre de jours invalide';
        }
      }
    }

    if (showNursingCommonFields) {
      if (!durationDays) return 'Prise en charge obligatoire';
      if (durationDays !== '1' && durationDays !== 'to_define' && !frequency) {
        return 'Fréquence obligatoire';
      }
    }

    return null;
  };

  const handleConfirm = () => {
    const err = validate();
    if (err) {
      setLocalError(err);
      return;
    }
    if (!category) return;

    const coPayload = { ...careOptions };
    stripOrphanAutreDetailKeys(coPayload);

    const service: SelectedServiceInput = {
      id: category.id,
      type: category.type,
      name: resolveRdvCareDisplayLabel(category.label, coPayload),
      category_id: category.id,
      icon: category.icon ?? undefined,
      category_image_url: category.image_url ?? null,
      ...(category.skip_prescription_documents
        ? { skip_prescription_documents: true as const }
        : {}),
    };

    const slice: BookingServiceFormSlice = { care_options: coPayload };

    if (showBloodSchedulingFields) {
      slice.blood_test_type = bloodTestType;
      if (bloodTestType === 'multiple') {
        slice.duration_days = durationDays;
        slice.custom_days = durationDays === 'custom' ? Number(customDays) || null : null;
      }
    }

    if (showNursingCommonFields) {
      slice.duration_days = durationDays;
      slice.custom_days = durationDays === 'custom' ? Number(customDays) || null : null;
      slice.frequency = showNursingFrequency(durationDays) ? frequency : '';
    }

    onConfirm({ service, slice });
    onClose();
  };

  const isOpen = visible && category != null;

  const formBody = !category ? null : (
    <>
      {localError ? (
        <View style={styles.errorBox}>
          <AppText accessibilityRole="alert" style={styles.errorText}>{localError}</AppText>
        </View>
      ) : null}

      {sortedCategoryOptions.map((opt) => {
        if (opt.field_type === 'select') {
          const selectItems = (opt.options ?? []).map((o) => ({
            label: o.label,
            value: o.value,
          }));
          return (
            <View key={opt.option_key}>
              <OptionSelect
                label={opt.label}
                required={!!opt.is_required}
                items={selectItems}
                value={String(careOptions[opt.option_key] ?? '')}
                onChange={(v) => setCareOpt(opt.option_key, v)}
              />
              {categorySelectHasAutreOption(opt) &&
              isAutreSelectValue(careOptions[opt.option_key]) ? (
                <Input
                  label="Précisez"
                  value={String(careOptions[careAutreDetailKey(opt.option_key)] ?? '')}
                  onChangeText={(v) => setCareOpt(careAutreDetailKey(opt.option_key), v)}
                />
              ) : null}
            </View>
          );
        }
        if (opt.field_type === 'text') {
          return (
            <Input
              key={opt.option_key}
              label={opt.label + (opt.is_required ? ' *' : '')}
              value={String(careOptions[opt.option_key] ?? '')}
              onChangeText={(v) => setCareOpt(opt.option_key, v)}
            />
          );
        }
        if (opt.field_type === 'number') {
          return (
            <Input
              key={opt.option_key}
              label={opt.label + (opt.is_required ? ' *' : '')}
              value={String(careOptions[opt.option_key] ?? '')}
              onChangeText={(v) => setCareOpt(opt.option_key, v)}
              keyboardType="number-pad"
            />
          );
        }
        return null;
      })}

      {showBloodSchedulingFields ? (
        <>
          <OptionSelect
            label="Type de prélèvement"
            required
            items={BLOOD_TEST_TYPE_OPTIONS}
            value={bloodTestType}
            onChange={setBloodTestType}
          />
          {bloodTestType === 'multiple' ? (
            <>
              <OptionSelect
                label="Nombre de jours"
                required
                items={MULTIPLE_DAYS_OPTIONS}
                value={durationDays}
                onChange={setDurationDays}
              />
              {durationDays === 'custom' ? (
                <Input
                  label="Nombre de jours (personnalisé)"
                  value={customDays}
                  onChangeText={setCustomDays}
                  keyboardType="number-pad"
                />
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      {showNursingCommonFields ? (
        <>
          <OptionSelect
            label="Prise en charge"
            required
            items={[...NURSING_DURATION_OPTIONS]}
            value={durationDays}
            onChange={setDurationDays}
          />
          {durationDays === 'custom' ? (
            <Input
              label="Nombre de jours"
              value={customDays}
              onChangeText={setCustomDays}
              keyboardType="number-pad"
            />
          ) : null}
          {showNursingFrequency(durationDays) ? (
            <OptionSelect
              label="Fréquence"
              required
              items={[...NURSING_FREQUENCY_OPTIONS]}
              value={frequency}
              onChange={setFrequency}
            />
          ) : null}
        </>
      ) : null}
    </>
  );

  const confirmButton = <Button title={confirmLabel} onPress={handleConfirm} fullWidth size="lg" />;

  if (embedded) {
    if (!isOpen) return null;
    return (
      <View style={styles.embeddedBody}>
        {formBody}
        <View style={styles.sheetFooter}>{confirmButton}</View>
      </View>
    );
  }

  return (
    <SheetModal
      visible={isOpen}
      onClose={onClose}
      title={category?.label ?? ''}
      subtitle="Quelques précisions sur ce soin."
      footer={confirmButton}
    >
      {formBody}
    </SheetModal>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  errorBox: {
    backgroundColor: c.errorLight,
    borderRadius: radius.lg,
    padding: spacing[3],
  },
  errorText: {
    ...font.medium,
    fontSize: fontSize.sm,
    color: c.error,
  },
  field: { gap: spacing[2] },
  sheetFooter: {
    paddingTop: spacing[4],
    marginTop: spacing[1],
  },
  embeddedBody: { gap: spacing[3] },
};
}


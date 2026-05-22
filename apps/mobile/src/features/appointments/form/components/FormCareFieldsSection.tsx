import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Input } from '@/components/ui/Input';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import {
  NURSING_DURATION_OPTIONS,
  NURSING_FREQUENCY_OPTIONS,
  showNursingFrequency,
} from '@oneandlab/shared-constants';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const BLOOD_TYPE_OPTIONS = [
  { label: 'Une seule fois', value: 'single' },
  { label: 'Plusieurs jours', value: 'multiple' },
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

const GENDER_PREF_OPTIONS = [
  { label: 'Sans préférence', value: 'any' },
  { label: 'Femme', value: 'female' },
  { label: 'Homme', value: 'male' },
];

function OptionPills({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.pillRow}>
        {options.map((o) => {
          const on = value === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              style={[styles.pill, on && styles.pillActive]}
            >
              <Text style={[styles.pillText, on && styles.pillTextActive]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

interface Props {
  type: string;
  bloodTestType?: string;
  durationDays?: string;
  customDays?: number;
  frequency?: string;
  preferredNurseGender?: string;
  notes?: string;
  onChange: (field: string, value: string) => void;
  hidePreferredNurseGender?: boolean;
}

export function FormCareFieldsSection({
  type,
  bloodTestType,
  durationDays,
  customDays,
  frequency,
  preferredNurseGender,
  notes,
  onChange,
  hidePreferredNurseGender,
}: Props) {
  if (isBloodTestAppointment(type)) {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.sectionLabel}>Prélèvement</Text>
        <OptionPills
          label="Type de prélèvement"
          options={BLOOD_TYPE_OPTIONS}
          value={bloodTestType ?? ''}
          onChange={(v) => onChange('blood_test_type', v)}
        />
        {bloodTestType === 'multiple' ? (
          <>
            <OptionPills
              label="Nombre de jours"
              options={MULTIPLE_DAYS_OPTIONS}
              value={durationDays ?? ''}
              onChange={(v) => onChange('duration_days', v)}
            />
            {durationDays === 'custom' ? (
              <Input
                label="Nombre de jours (personnalisé)"
                value={String(customDays ?? '')}
                onChangeText={(v) => onChange('custom_days', v)}
                keyboardType="number-pad"
              />
            ) : null}
          </>
        ) : null}
        <Input label="Notes (optionnel)" value={notes ?? ''} onChangeText={(v) => onChange('notes', v)} multiline />
      </View>
    );
  }

  if (isNursingAppointment(type)) {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.sectionLabel}>Soins infirmiers</Text>
        <OptionPills
          label="Prise en charge"
          options={[...NURSING_DURATION_OPTIONS]}
          value={durationDays ?? ''}
          onChange={(v) => onChange('duration_days', v)}
        />
        {showNursingFrequency(durationDays) ? (
          <OptionPills
            label="Fréquence des passages"
            options={[...NURSING_FREQUENCY_OPTIONS]}
            value={frequency ?? ''}
            onChange={(v) => onChange('frequency', v)}
          />
        ) : null}
        {!hidePreferredNurseGender ? (
          <OptionPills
            label="Préférence infirmier(ère)"
            options={GENDER_PREF_OPTIONS}
            value={preferredNurseGender ?? 'any'}
            onChange={(v) => onChange('preferred_nurse_gender', v)}
          />
        ) : null}
        <Input label="Notes (optionnel)" value={notes ?? ''} onChangeText={(v) => onChange('notes', v)} multiline />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing[3] },
  sectionLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  group: { gap: spacing[2] },
  groupLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  pill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  pillTextActive: { color: colors.textInverse },
});

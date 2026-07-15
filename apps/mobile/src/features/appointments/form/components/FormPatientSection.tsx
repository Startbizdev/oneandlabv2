import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Cluster, Row } from '@/components/layout/primitives';
import { ChevronDown, UserPlus, Users } from 'lucide-react-native';
import { BirthDatePicker } from '@/components/ui/BirthDatePicker';
import { GenderSelect } from '@/features/auth/components/GenderSelect';
import { Input } from '@/components/ui/Input';
import { lookupPatientByContact } from '@/features/patients/api/patient-lookup.service';
import type { PatientRow } from '@/features/patients/api/fetch-all-patients';
import { PatientDuplicatePrompt } from './PatientDuplicatePrompt';
import { PatientSelectSheet } from './PatientSelectSheet';
import { useToast } from '@/providers/ToastProvider';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { normalizePatientGender, patientGenderIsSet } from '@/utils/patient-gender';

export interface PatientOption {
  id: string;
  label: string;
  /** Téléphone / email — recherche uniquement, jamais affiché dans la liste. */
  searchText?: string;
}

export type PatientMode = 'existing' | 'new';

interface Props {
  patients: PatientOption[];
  patientMode: PatientMode;
  onPatientModeChange: (mode: PatientMode) => void;
  selectedPatientId: string;
  onSelectPatient: (id: string, opts?: { keepMode?: boolean }) => void;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  birthDate: string;
  onChange: (field: string, value: string) => void;
  emailOptional?: boolean;
  onAdoptLookupPatient?: (patient: PatientRow) => void;
}

export function FormPatientSection({
  patients,
  patientMode,
  onPatientModeChange,
  selectedPatientId,
  onSelectPatient,
  firstName,
  lastName,
  email,
  phone,
  gender,
  birthDate,
  onChange,
  emailOptional,
  onAdoptLookupPatient,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_form_components_FormPatientSection_tsx_styles');
  const { show: toast } = useToast();
  const [selectOpen, setSelectOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateRow, setDuplicateRow] = useState<PatientRow | null>(null);
  const suppressKeyRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedLabel =
    patients.find((p) => p.id === selectedPatientId)?.label ?? 'Sélectionner un patient…';

  const existingProfileIncomplete =
    patientMode === 'existing' &&
    Boolean(selectedPatientId) &&
    (!patientGenderIsSet(gender) || !birthDate.trim());

  const runLookup = useCallback(async () => {
    if (patientMode !== 'new') return;
    const em = email.trim();
    const ph = phone.trim();
    if (!em && !ph.replace(/\D/g, '')) {
      setDuplicateOpen(false);
      setDuplicateRow(null);
      return;
    }

    try {
      const res = await lookupPatientByContact(em, ph);
      const row = res.success ? res.data : null;
      if (!row?.id) {
        setDuplicateOpen(false);
        setDuplicateRow(null);
        return;
      }
      const suppress = `${em}|${ph}|${row.id}`;
      if (suppressKeyRef.current === suppress) return;
      setDuplicateRow(row);
      setDuplicateOpen(true);
    } catch {
      /* silencieux */
    }
  }, [email, patientMode, phone]);

  useEffect(() => {
    if (patientMode !== 'new') {
      setDuplicateOpen(false);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void runLookup();
    }, 450);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [email, phone, patientMode, runLookup]);

  const dismissDuplicate = () => {
    if (duplicateRow?.id) {
      suppressKeyRef.current = `${email.trim()}|${phone.trim()}|${duplicateRow.id}`;
    }
    setDuplicateOpen(false);
    setDuplicateRow(null);
  };

  const adoptDuplicate = () => {
    if (!duplicateRow) return;
    setDuplicateOpen(false);
    onAdoptLookupPatient?.(duplicateRow);
    onSelectPatient(duplicateRow.id, { keepMode: true });
    toast('Patient existant sélectionné', { type: 'success' });
    setDuplicateRow(null);
    suppressKeyRef.current = '';
  };

  return (
    <View style={styles.wrapper}>
      <AppText style={styles.sectionLabel}>Patient</AppText>

      <Row gap={spacing[2]} style={styles.modeTabs}>
        <Pressable
          onPress={() => onPatientModeChange('existing')}
          style={[styles.modeTab, patientMode === 'existing' && styles.modeTabActive]}
        >
          <Row gap={spacing[1.5]} align="center" justify="center">
            <Users size={iconSize.sm} color={patientMode === 'existing' ? c.primary : c.textTertiary} />
            <AppText style={[styles.modeTabText, patientMode === 'existing' && styles.modeTabTextActive]}>
              Patient dans la liste
            </AppText>
          </Row>
        </Pressable>
        <Pressable
          onPress={() => onPatientModeChange('new')}
          style={[styles.modeTab, patientMode === 'new' && styles.modeTabActive]}
        >
          <Row gap={spacing[1.5]} align="center" justify="center">
            <UserPlus size={iconSize.sm} color={patientMode === 'new' ? c.primary : c.textTertiary} />
            <AppText style={[styles.modeTabText, patientMode === 'new' && styles.modeTabTextActive]}>
              Nouveau patient
            </AppText>
          </Row>
        </Pressable>
      </Row>

      {patientMode === 'existing' ? (
        <>
          <AppText style={styles.fieldLabel}>Choisir un patient</AppText>
          <Pressable onPress={() => setSelectOpen(true)} style={styles.selectBtn}>
            <Cluster
              actions={<ChevronDown size={iconSize.mdSm} color={c.textTertiary} />}
            >
              <AppText
                style={[
                  styles.selectBtnText,
                  !selectedPatientId && styles.selectPlaceholder,
                ]}
                numberOfLines={1}
              >
                {selectedLabel}
              </AppText>
            </Cluster>
          </Pressable>
          {selectedPatientId ? (
            <View style={styles.existingProfileCard}>
              <AppText style={styles.existingProfileTitle}>Fiche patient</AppText>
              {existingProfileIncomplete ? (
                <AppText style={styles.existingProfileHint}>
                  Complétez les informations manquantes pour valider le rendez-vous.
                </AppText>
              ) : (
                <AppText style={styles.existingProfileHint}>
                  Vous pouvez corriger les coordonnées avant la prise de rendez-vous.
                </AppText>
              )}
              <Input label="Prénom" value={firstName} onChangeText={(v) => onChange('first_name', v)} />
              <Input label="Nom" value={lastName} onChangeText={(v) => onChange('last_name', v)} />
              <Input
                label={emailOptional ? 'Email (optionnel)' : 'Email'}
                value={email}
                onChangeText={(v) => onChange('email', v)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Input
                label="Téléphone"
                value={phone}
                onChangeText={(v) => onChange('phone', v)}
                keyboardType="phone-pad"
              />
              <GenderSelect
                label="Genre"
                value={normalizePatientGender(gender)}
                onChange={(v) => onChange('gender', v)}
              />
              <BirthDatePicker value={birthDate} onChange={(v) => onChange('birth_date', v)} />
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.fields}>
          {duplicateOpen && duplicateRow ? (
            <PatientDuplicatePrompt
              patient={duplicateRow}
              variant="booking"
              onDismiss={dismissDuplicate}
              onUseExisting={adoptDuplicate}
            />
          ) : null}
          <Input label="Prénom" value={firstName} onChangeText={(v) => onChange('first_name', v)} />
          <Input label="Nom" value={lastName} onChangeText={(v) => onChange('last_name', v)} />
          <Input
            label={emailOptional ? 'Email (optionnel)' : 'Email'}
            value={email}
            onChangeText={(v) => onChange('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Téléphone"
            value={phone}
            onChangeText={(v) => onChange('phone', v)}
            keyboardType="phone-pad"
          />
          <View style={styles.genderRow}>
            <AppText style={styles.fieldLabel}>Genre</AppText>
            <Row gap={spacing[2]}>
              {(['M', 'F'] as const).map((g) => {
                const norm = normalizePatientGender(gender);
                const on = (g === 'M' && norm === 'male') || (g === 'F' && norm === 'female');
                return (
                  <Pressable
                    key={g}
                    onPress={() => onChange('gender', g === 'M' ? 'male' : 'female')}
                    style={[styles.genderPill, on && styles.genderPillActive]}
                  >
                    <AppText style={[styles.genderText, on && styles.genderTextActive]}>
                      {g === 'M' ? 'Homme' : 'Femme'}
                    </AppText>
                  </Pressable>
                );
              })}
            </Row>
          </View>
          <BirthDatePicker value={birthDate} onChange={(v) => onChange('birth_date', v)} />
        </View>
      )}

      <PatientSelectSheet
        visible={selectOpen}
        patients={patients}
        selectedId={selectedPatientId}
        onClose={() => setSelectOpen(false)}
        onSelect={onSelectPatient}
      />

    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrapper: { gap: spacing[3] },
  sectionLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  modeTabs: {
    padding: spacing[1],
    borderRadius: radius.xl,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  modeTab: {
    minWidth: 0,
    flex: 1,
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[2],
    borderRadius: radius.lg,
  },
  modeTabActive: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.primaryMid,
  },
  modeTabText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    textAlign: 'center' as const,
  },
  modeTabTextActive: {
    color: c.primary,
    fontFamily: fontFamily.semiBold,
  },
  fieldLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  selectBtn: {
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  selectBtnText: {
    minWidth: 0,
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  selectPlaceholder: { color: c.textTertiary },
  fields: { gap: spacing[2] },
  existingProfileCard: {
    gap: spacing[2],
    marginTop: spacing[1],
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.borderLight,
    backgroundColor: c.surfaceAlt,
  },
  existingProfileTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  existingProfileHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    lineHeight: fontSize.xs * 1.45,
    marginBottom: spacing[1],
  },
  genderRow: { gap: spacing[2] },
  genderPill: {
    minWidth: 0,
    flex: 1,
    paddingVertical: spacing[2.5],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: 'center' as const,
  },
  genderPillActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  genderText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  genderTextActive: { color: c.textInverse },
};
}


import { useAppColors } from '@/theme/use-app-colors';

import { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { PatientLookupResult } from '@oneandlab/shared-api';
import { Cluster, Row } from '@/components/layout/primitives';
import { ChevronDown, UserPlus, Users } from 'lucide-react-native';
import { BirthDatePicker } from '@/components/ui/BirthDatePicker';
import { GenderSelect } from '@/features/auth/components/GenderSelect';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { usePatientDuplicateDetection } from '@/features/patients/hooks/use-patient-duplicate-detection';
import { PatientDuplicatePrompt } from './PatientDuplicatePrompt';
import { PatientSelectSheet } from './PatientSelectSheet';
import {
  THIRD_PARTY_EMAIL_INPUT,
  THIRD_PARTY_NAME_INPUT,
  THIRD_PARTY_PHONE_INPUT,
} from '../constants/third-party-input-props';
import { useToast } from '@/providers/ToastProvider';
import { ICON_STROKE_WIDTH, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';
import { normalizePatientGender, patientGenderIsSet } from '@/utils/patient-gender';

export interface PatientOption {
  id: string;
  label: string;
  /** Téléphone / email — recherche uniquement, jamais affiché dans la liste. */
  searchText?: string;
}

export type PatientMode = 'existing' | 'new';

interface Props {
  patientsLoading?: boolean;
  patientsError?: boolean;
  retryPatients?: () => void;
  patientProfileLoading?: boolean;
  patientProfileError?: boolean;
  retryPatientProfile?: () => void;
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
  /** Rattache le dossier trouvé ; `false` si l'adoption n'a pas eu lieu (consentement manquant, refus serveur). */
  onAdoptLookupPatient: (match: PatientLookupResult) => Promise<boolean>;
}

export function FormPatientSection({
  patientsLoading = false, patientsError = false, retryPatients,
  patientProfileLoading = false, patientProfileError = false, retryPatientProfile,
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
  const styles = useStyles(buildStyles);
  const { show: toast } = useToast();
  const [selectOpen, setSelectOpen] = useState(false);
  const [adopting, setAdopting] = useState(false);
  const { duplicate, dismissDuplicate, resetDuplicate } = usePatientDuplicateDetection(
    email,
    phone,
    patientMode === 'new',
  );

  const selectedLabel =
    patients.find((p) => p.id === selectedPatientId)?.label ?? 'Sélectionner un patient…';

  const existingProfileIncomplete =
    patientMode === 'existing' &&
    Boolean(selectedPatientId) &&
    (!patientGenderIsSet(gender) || !birthDate.trim());

  const adoptDuplicate = async () => {
    if (!duplicate || adopting) return;
    setAdopting(true);
    try {
      if (!(await onAdoptLookupPatient(duplicate))) return;
      resetDuplicate();
      toast('Patient existant sélectionné', { type: 'success' });
    } finally {
      setAdopting(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.modeTabs} accessibilityRole="radiogroup">
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: patientMode === 'existing' }}
          onPress={() => onPatientModeChange('existing')}
          style={[styles.modeTab, patientMode === 'existing' && styles.modeTabActive]}
        >
          <Row gap={spacing[1.5]} align="center" justify="center">
            <Users
              size={iconSize.md}
              color={patientMode === 'existing' ? c.primaryDark : c.textSecondary}
              strokeWidth={ICON_STROKE_WIDTH}
            />
            <AppText style={[styles.modeTabText, patientMode === 'existing' && styles.modeTabTextActive]}>
              Patient existant
            </AppText>
          </Row>
        </Pressable>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: patientMode === 'new' }}
          onPress={() => onPatientModeChange('new')}
          style={[styles.modeTab, patientMode === 'new' && styles.modeTabActive]}
        >
          <Row gap={spacing[1.5]} align="center" justify="center">
            <UserPlus
              size={iconSize.md}
              color={patientMode === 'new' ? c.primaryDark : c.textSecondary}
              strokeWidth={ICON_STROKE_WIDTH}
            />
            <AppText style={[styles.modeTabText, patientMode === 'new' && styles.modeTabTextActive]}>
              Nouveau patient
            </AppText>
          </Row>
        </Pressable>
      </View>

      {patientMode === 'existing' ? (
        <>
          {patientsError ? <View style={styles.errorBox}>
            <AppText accessibilityRole="alert" style={styles.errorText}>Liste des patients indisponible.</AppText>
            <Button title="Recharger les patients" variant="outline" loading={patientsLoading} onPress={retryPatients} />
          </View> : null}
          {patientsLoading ? <AppText style={styles.existingProfileHint}>Chargement des patients…</AppText> : null}
          <Pressable accessibilityRole="button" accessibilityLabel={`Choisir un patient : ${selectedLabel}`} accessibilityState={{ disabled: patientsLoading || patientsError }} disabled={patientsLoading || patientsError} onPress={() => setSelectOpen(true)} style={styles.selectBtn}>
            <Cluster
              actions={<ChevronDown size={iconSize.md} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />}
            >
              <AppText
                style={[
                  styles.selectBtnText,
                  !selectedPatientId && styles.selectPlaceholder,
                ]}
              >
                {selectedLabel}
              </AppText>
            </Cluster>
          </Pressable>
          {patientProfileLoading ? <AppText accessibilityLiveRegion="polite" style={styles.existingProfileHint}>Chargement du dossier patient…</AppText> : null}
          {patientProfileError ? <View style={styles.errorBox}>
            <AppText accessibilityRole="alert" style={styles.errorText}>Dossier patient indisponible. Rechargez-le pour utiliser les bonnes coordonnées.</AppText>
            <Button title="Recharger le dossier" variant="outline" onPress={retryPatientProfile} />
          </View> : null}
          {selectedPatientId && !patientProfileLoading && !patientProfileError ? (
            <View style={styles.existingProfileCard}>
              <AppText variant="secondary" style={styles.existingProfileHint}>
                {existingProfileIncomplete
                  ? 'Complétez les informations manquantes pour valider le rendez-vous.'
                  : 'Vous pouvez corriger les coordonnées avant de valider.'}
              </AppText>
              <Input label="Prénom" value={firstName} onChangeText={(v) => onChange('first_name', v)} {...THIRD_PARTY_NAME_INPUT} />
              <Input label="Nom" value={lastName} onChangeText={(v) => onChange('last_name', v)} {...THIRD_PARTY_NAME_INPUT} />
              <Input
                label={emailOptional ? 'Email (optionnel)' : 'Email'}
                value={email}
                onChangeText={(v) => onChange('email', v)}
                {...THIRD_PARTY_EMAIL_INPUT}
              />
              <Input
                label="Téléphone"
                value={phone}
                onChangeText={(v) => onChange('phone', v)}
                {...THIRD_PARTY_PHONE_INPUT}
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
          {duplicate ? (
            <PatientDuplicatePrompt
              patient={duplicate.patient}
              variant="booking"
              adopting={adopting}
              onDismiss={dismissDuplicate}
              onUseExisting={() => void adoptDuplicate()}
            />
          ) : null}
          <Input label="Prénom" value={firstName} onChangeText={(v) => onChange('first_name', v)} {...THIRD_PARTY_NAME_INPUT} />
          <Input label="Nom" value={lastName} onChangeText={(v) => onChange('last_name', v)} {...THIRD_PARTY_NAME_INPUT} />
          <Input
            label={emailOptional ? 'Email (optionnel)' : 'Email'}
            value={email}
            onChangeText={(v) => onChange('email', v)}
            {...THIRD_PARTY_EMAIL_INPUT}
          />
          <Input
            label="Téléphone"
            value={phone}
            onChangeText={(v) => onChange('phone', v)}
            {...THIRD_PARTY_PHONE_INPUT}
          />
          <GenderSelect
            label="Genre"
            value={normalizePatientGender(gender)}
            onChange={(v) => onChange('gender', v)}
          />
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

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    errorBox: { padding: spacing[3], gap: spacing[2], borderRadius: radius.lg, backgroundColor: c.errorLight },
    errorText: { color: c.error, fontSize: fontSize.sm },
  wrapper: { gap: spacing[3] },
  modeTabs: {
    flexDirection: 'row' as const,
    gap: spacing[2],
    padding: spacing[1],
    borderRadius: radius.lg,
    backgroundColor: c.surfaceAlt,
  },
  modeTab: {
    minWidth: 0,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center' as const,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    borderRadius: radius.lg,
  },
  modeTabActive: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.primaryMid,
  },
  modeTabText: {
    ...font.semiBold,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    textAlign: 'center' as const,
  },
  modeTabTextActive: {
    color: c.primaryDark,
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
    ...font.medium,
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
  existingProfileHint: {
    marginBottom: spacing[1],
  },
};
}


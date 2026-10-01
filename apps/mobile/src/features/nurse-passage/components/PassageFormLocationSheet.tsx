import { layoutRowBetween } from '@/theme/layout-styles';
import { hexToRgba } from '@/theme/color-utils';
import { useAppColors } from '@/theme/use-app-colors';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { SheetModal } from '@/components/ui/SheetModal';
import { Button } from '@/components/ui/Button';
import { AddressAutocomplete } from '@/features/address/components/AddressAutocomplete';
import type { AddressPayload } from '@/features/appointments/form/types';
import { useProfileAddressSync } from '@/features/appointments/form/hooks/useProfileAddressSync';
import { hasValidGeoAddress } from '@/features/profile/utils/parse-profile-address';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { passagePatientQueryKey } from '../hooks/use-passage-patient';
import { ICON_STROKE_WIDTH, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

type Props = {
  visible: boolean;
  atHome: boolean;
  patientId: string;
  patientAddressRaw?: unknown;
  onClose: () => void;
  onConfirm: (atHome: boolean) => void;
};

const OPTIONS = [
  { value: true, label: 'À domicile', hint: 'Adresse du patient' },
  { value: false, label: 'Au cabinet', hint: 'Votre adresse professionnelle' },
] as const;

export function PassageFormLocationSheet({
  visible,
  atHome,
  patientId,
  patientAddressRaw,
  onClose,
  onConfirm,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const userId = user?.id ?? null;

  const [draftAtHome, setDraftAtHome] = useState(atHome);
  const [patientAddress, setPatientAddress] = useState<AddressPayload | null>(null);
  const [patientComplement, setPatientComplement] = useState('');
  const [nurseAddress, setNurseAddress] = useState<AddressPayload | null>(null);
  const [nurseComplement, setNurseComplement] = useState('');

  const patientAddressRef = useRef(patientAddress);
  patientAddressRef.current = patientAddress;
  const nurseAddressRef = useRef(nurseAddress);
  nurseAddressRef.current = nurseAddress;

  const patientSync = useProfileAddressSync({
    getProfileId: () => (patientId ? patientId : null),
    isPatientSelf: false,
    setFormAddress: setPatientAddress,
    getFormAddress: () => patientAddressRef.current,
    addressComplement: patientComplement,
    setAddressComplement: setPatientComplement,
  });

  const nurseSync = useProfileAddressSync({
    getProfileId: () => user?.id ?? null,
    isPatientSelf: true,
    setFormAddress: setNurseAddress,
    getFormAddress: () => nurseAddressRef.current,
    addressComplement: nurseComplement,
    setAddressComplement: setNurseComplement,
  });

  const patientAddressKey = useMemo(
    () => JSON.stringify(patientAddressRaw ?? null),
    [patientAddressRaw],
  );

  /** Dernières valeurs lues par l'effet d'ouverture sans le relancer : `fetchMe` régénère `user` et les callbacks de synchro. */
  const openSyncRef = useRef({
    patientAddressRaw,
    applyPatientRaw: patientSync.applyFromRaw,
    loadNurseAddress: nurseSync.loadProfileAddress,
  });
  openSyncRef.current = {
    patientAddressRaw,
    applyPatientRaw: patientSync.applyFromRaw,
    loadNurseAddress: nurseSync.loadProfileAddress,
  };

  const openedRef = useRef(false);
  const lastPatientKeyRef = useRef('');
  const nurseLoadedRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      openedRef.current = false;
      lastPatientKeyRef.current = '';
      nurseLoadedRef.current = false;
      return;
    }

    const justOpened = !openedRef.current;
    openedRef.current = true;

    if (justOpened) {
      setDraftAtHome(atHome);
    }

    const patientChanged = lastPatientKeyRef.current !== patientAddressKey;
    if (justOpened || patientChanged) {
      lastPatientKeyRef.current = patientAddressKey;
      void openSyncRef.current.applyPatientRaw(openSyncRef.current.patientAddressRaw);
    }

    if (justOpened && userId && !nurseLoadedRef.current) {
      nurseLoadedRef.current = true;
      void openSyncRef.current.loadNurseAddress(userId);
    }
  }, [visible, atHome, patientAddressKey, patientId, userId]);

  const handleValidate = () => {
    const activeAddress = draftAtHome ? patientAddress : nurseAddress;
    if (!hasValidGeoAddress(activeAddress)) {
      toast(
        draftAtHome
          ? 'Sélectionnez l’adresse du patient dans la liste de suggestions.'
          : 'Sélectionnez votre adresse professionnelle dans la liste de suggestions.',
        { type: 'error' },
      );
      return;
    }
    onConfirm(draftAtHome);
    void qc.invalidateQueries({ queryKey: passagePatientQueryKey(patientId) });
    void fetchMe();
    onClose();
  };

  const handleClose = () => {
    void qc.invalidateQueries({ queryKey: passagePatientQueryKey(patientId) });
    onClose();
  };

  return (
    <SheetModal
      visible={visible}
      onClose={handleClose}
      title="Lieu du passage"
      snapPoints={['88%']}
      footer={<Button title="Valider" onPress={handleValidate} />}
    >
      <View style={styles.body}>
        <View style={styles.list}>
          {OPTIONS.map((opt) => {
            const selected = draftAtHome === opt.value;
            return (
              <Pressable
                key={String(opt.value)}
                onPress={() => setDraftAtHome(opt.value)}
                style={[
                  styles.option,
                  {
                    borderColor: selected ? c.primary : c.borderLight,
                    backgroundColor: selected ? hexToRgba(c.primary, 0.08) : c.surface,
                  },
                ]}
              >
                <View style={styles.textCol}>
                  <AppText style={[styles.label, { color: c.textPrimary }]}>{opt.label}</AppText>
                  <AppText style={[styles.hint, { color: c.textSecondary }]}>{opt.hint}</AppText>
                </View>
                {selected ? <Check size={iconSize.md} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} /> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.addressBlock}>
          <AppText style={[styles.addressTitle, { color: c.textPrimary }]}>
            {draftAtHome ? 'Adresse du patient' : 'Mon adresse professionnelle'}
          </AppText>
          <AppText style={[styles.addressHint, { color: c.textTertiary }]}>
            {draftAtHome
              ? 'La modification est enregistrée sur la fiche du patient.'
              : 'La modification est enregistrée sur votre profil professionnel.'}
          </AppText>
          {draftAtHome ? (
            <AddressAutocomplete
              value={patientAddress}
              complement={patientComplement}
              onChange={patientSync.onAddressChange}
              onComplementChange={patientSync.onComplementChange}
              label="Adresse du patient"
            />
          ) : (
            <AddressAutocomplete
              value={nurseAddress}
              complement={nurseComplement}
              onChange={nurseSync.onAddressChange}
              onComplementChange={nurseSync.onComplementChange}
              label="Adresse professionnelle"
            />
          )}
        </View>
      </View>
    </SheetModal>
  );
}

function buildStyles({ fontSize }: Theme) {
  return {
    body: { gap: spacing[4], paddingBottom: spacing[4] },
    list: { gap: spacing[2] },
    option: {
      ...layoutRowBetween(spacing[3]),
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radius.lg,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3.5],
    },
    textCol: {
    minWidth: 0, flex: 1, gap: spacing[0.5] },
    label: { ...font.semiBold, fontSize: fontSize.md },
    hint: { ...font.regular, fontSize: fontSize.sm },
    addressBlock: { gap: spacing[2] },
    addressTitle: { ...font.semiBold, fontSize: fontSize.base },
    addressHint: {
      ...font.regular,
      fontSize: fontSize.xs,
      lineHeight: fontSize.xs * 1.45,
    },
  };
}

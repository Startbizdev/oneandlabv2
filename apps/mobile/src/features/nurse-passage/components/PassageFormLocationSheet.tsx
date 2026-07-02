import type { AppColors } from '@/theme/colors';
import { hexToRgba } from '@/theme/color-utils';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { AddressAutocomplete } from '@/features/address/components/AddressAutocomplete';
import type { AddressPayload } from '@/features/appointments/form/types';
import { useProfileAddressSync } from '@/features/appointments/form/hooks/useProfileAddressSync';
import { hasValidGeoAddress } from '@/features/profile/utils/parse-profile-address';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

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
  const styles = useThemedStyles(buildStyles);
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);

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
      void patientSync.applyFromRaw(patientAddressRaw);
    }

    if (justOpened && user?.id && !nurseLoadedRef.current) {
      nurseLoadedRef.current = true;
      void nurseSync.loadProfileAddress(user.id);
    }
    // Ne pas dépendre de user.address : fetchMe le met à jour et relançait applyFromRaw en boucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, atHome, patientAddressKey, patientId, user?.id]);

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
    void qc.invalidateQueries({ queryKey: ['passage-patient', patientId] });
    void fetchMe();
    onClose();
  };

  const handleClose = () => {
    void qc.invalidateQueries({ queryKey: ['passage-patient', patientId] });
    onClose();
  };

  return (
    <BottomSheet
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
                  <Text style={[styles.label, { color: c.textPrimary }]}>{opt.label}</Text>
                  <Text style={[styles.hint, { color: c.textSecondary }]}>{opt.hint}</Text>
                </View>
                {selected ? <Check size={18} color={c.primary} strokeWidth={2.5} /> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.addressBlock}>
          <Text style={[styles.addressTitle, { color: c.textPrimary }]}>
            {draftAtHome ? 'Adresse du patient' : 'Mon adresse professionnelle'}
          </Text>
          <Text style={[styles.addressHint, { color: c.textTertiary }]}>
            {draftAtHome
              ? 'La modification est enregistrée sur la fiche du patient.'
              : 'La modification est enregistrée sur votre profil professionnel.'}
          </Text>
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
    </BottomSheet>
  );
}

function buildStyles(_c: AppColors) {
  return {
    body: { gap: spacing[4], paddingBottom: spacing[4] },
    list: { gap: spacing[2] },
    option: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: spacing[3],
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radius.lg,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3.5],
    },
    textCol: { flex: 1, gap: spacing[0.5] },
    label: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md },
    hint: { fontFamily: fontFamily.regular, fontSize: fontSize.sm },
    addressBlock: { gap: spacing[2] },
    addressTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.base },
    addressHint: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      lineHeight: fontSize.xs * 1.45,
    },
  };
}

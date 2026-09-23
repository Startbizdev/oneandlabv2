import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FilePlus2, Home, Plus, Store, Trash2 } from 'lucide-react-native';
import type { PharmacyCatalogItem, PharmacyFulfillmentMode } from '@oneandlab/shared-types';
import { PHARMACY_FULFILLMENT_LABELS } from '@oneandlab/shared-constants';
import { FormScreen } from '@/components/layout/FormScreen';
import { Row } from '@/components/layout/primitives';
import { FullWidthSegmentBar } from '@/components/ui/FullWidthSegmentBar';
import { Input } from '@/components/ui/Input';
import { BookingActionBar } from '@/features/appointments/form/components/BookingActionBar';
import { BookingWizardProgress } from '@/features/appointments/form/components/BookingWizardProgress';
import { RelativeQuickAddSheet } from '@/features/appointments/form/components/RelativeQuickAddSheet';
import type { DocumentFileRef } from '@/features/appointments/form/types/document-file-ref';
import { isLocalFileRef, isProfileDocRef } from '@/features/appointments/form/types/document-file-ref';
import { pickMedicalDocumentFile } from '@/lib/uploads/pick-medical-document';
import { AddressAutocomplete } from '@/features/address/components/AddressAutocomplete';
import type { AddressPayload } from '@/features/appointments/form/types';
import { PrescriptionPatientSelectField } from '@/features/prescriptions/components/PrescriptionPatientSelectField';
import {
  flattenPrescriptionPickerPatients,
  prescriptionPatientPickerTotalCount,
  usePrescriptionPatientPickerInfinite,
} from '@/features/prescriptions/hooks/use-prescription-patient-picker-infinite';
import { fetchPatientRelatives, type PatientRelative } from '@/features/patient-relatives/api/patient-relatives.service';
import { fetchUser } from '@/features/profile/api/profile.service';
import { resolvePatientAddressForRdvForm } from '@/utils/patient-address-rdv';
import { uploadMedicalDocument } from '@/lib/uploads/upload-file';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { StackHeaderBackButton } from '@/navigation/StackHeaderBackButton';
import { useStackScrollConfig } from '@/navigation/use-stack-scroll-config';
import { spreadTabSceneScrollProps } from '@/components/navigation/liquid-glass-header-inset';
import { PharmacyCatalogCard } from '../components/PharmacyCatalogCard';
import { IsoDatePicker } from '@/features/nurse-passage/components/IsoDatePicker';
import {
  addPharmacyFavorite,
  createPharmacyOrder,
  fetchPharmacyCatalog,
  fetchPharmacyFavoriteIds,
  removePharmacyFavorite,
} from '../api/pharmacy-orders.service';
import { personDisplayName, pharmacyFulfillmentLabel } from '../utils/order-display';
import { usePharmacyModuleEnabled } from '../hooks/use-pharmacy-module-enabled';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const CATALOG_WIZARD_STEPS = 4;
const OWN_PHARMACY_WIZARD_STEPS = 3;
interface Props {
  rolePrefix: '/(nurse)' | '/(pro)';
  initialPatientId?: string;
}

export function PharmacyOrderWizardScreen({ rolePrefix, initialPatientId }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PharmacyOrderWizardScreen');
  const router = useRouter();
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const { isOwnPharmacy } = usePharmacyModuleEnabled();

  const [step, setStep] = useState(1);
  const [fulfillmentMode, setFulfillmentMode] = useState<PharmacyFulfillmentMode>('click_collect');
  const [patientId, setPatientId] = useState(initialPatientId ?? '');
  const [relativeId, setRelativeId] = useState<string | null>(null);
  const [address, setAddress] = useState<AddressPayload | null>(null);
  const [addressComplement, setAddressComplement] = useState('');
  const [selectedPharmacyId, setSelectedPharmacyId] = useState('');
  const [comment, setComment] = useState('');
  const [rxFiles, setRxFiles] = useState<DocumentFileRef[]>([]);
  const [desiredDate, setDesiredDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [relativeSheetOpen, setRelativeSheetOpen] = useState(false);
  const [favoritePendingId, setFavoritePendingId] = useState<string | null>(null);

  const scrollConfig = useStackScrollConfig(styles.formContent);
  const addressAlertShown = useRef<string | null>(null);

  const patientsQ = usePrescriptionPatientPickerInfinite(true);
  const patients = useMemo(
    () => flattenPrescriptionPickerPatients(patientsQ.data?.pages),
    [patientsQ.data?.pages],
  );
  useEffect(() => {
    if (initialPatientId) setPatientId(initialPatientId);
  }, [initialPatientId]);

  const relativesQ = useQuery({
    queryKey: ['patient-relatives', patientId],
    queryFn: async () => {
      const res = await fetchPatientRelatives(patientId);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Proches indisponibles');
      return res.data;
    },
    enabled: !!patientId,
  });

  const postalCode = address?.postal_code?.trim() ?? '';

  const catalogQ = useQuery({
    queryKey: queryKeys.pharmacyOrders.catalog(postalCode, fulfillmentMode),
    queryFn: async () => {
      const res = await fetchPharmacyCatalog({
        postal_code: postalCode || undefined,
        fulfillment_mode: fulfillmentMode,
      });
      if (!res.success || !res.data) throw new Error(res.error ?? 'Catalogue indisponible');
      return res.data;
    },
    enabled: !isOwnPharmacy && step >= 3,
  });

  const favoritesQ = useQuery({
    queryKey: queryKeys.pharmacyOrders.favorites(userId),
    queryFn: async () => {
      const res = await fetchPharmacyFavoriteIds();
      if (!res.success || !res.data) throw new Error(res.error ?? 'Favoris indisponibles');
      return new Set(res.data.pharmacy_ids ?? []);
    },
    enabled: !isOwnPharmacy && !!userId && step >= 3,
  });

  useEffect(() => {
    if (isOwnPharmacy && userId) setSelectedPharmacyId(userId);
  }, [isOwnPharmacy, userId]);

  const selectedPatient = patients.find((p) => p.id === patientId);
  const selectedPharmacy = catalogQ.data?.find((p) => p.id === selectedPharmacyId);
  const selectedRelative = (relativesQ.data ?? []).find((r) => r.id === relativeId);

  const applyAddressFromProfile = useCallback(async (rawAddress: unknown) => {
    const resolved = await resolvePatientAddressForRdvForm(rawAddress);
    if (!resolved?.label?.trim()) {
      setAddress(null);
      setAddressComplement('');
      return false;
    }
    setAddress({
      label: resolved.label,
      lat: resolved.lat,
      lng: resolved.lng,
      postal_code: undefined,
      city: undefined,
    });
    setAddressComplement(resolved.complement ?? '');
    return true;
  }, []);

  useEffect(() => {
    if (!patientId || fulfillmentMode !== 'home_delivery') return;
    let cancelled = false;

    void (async () => {
      if (relativeId && selectedRelative) {
        const ok = await applyAddressFromProfile(selectedRelative.address);
        if (!cancelled && !ok && addressAlertShown.current !== `${patientId}:${relativeId}`) {
          addressAlertShown.current = `${patientId}:${relativeId}`;
          Alert.alert(
            'Adresse manquante',
            'Ce proche n’a pas d’adresse enregistrée. Saisissez l’adresse de livraison ci-dessous ou complétez sa fiche.',
          );
        }
        return;
      }

      const fromPicker = selectedPatient?.address;
      if (fromPicker) {
        const ok = await applyAddressFromProfile(fromPicker);
        if (!cancelled && !ok) {
          const profile = await fetchUser(patientId);
          const okProfile = await applyAddressFromProfile(profile.data?.address);
          if (!cancelled && !okProfile && addressAlertShown.current !== patientId) {
            addressAlertShown.current = patientId;
            Alert.alert(
              'Adresse manquante',
              'Ce patient n’a pas d’adresse dans son dossier. Saisissez l’adresse de livraison ou complétez sa fiche patient.',
            );
          }
        }
        return;
      }

      const profile = await fetchUser(patientId);
      if (cancelled) return;
      const ok = await applyAddressFromProfile(profile.data?.address);
      if (!ok && addressAlertShown.current !== patientId) {
        addressAlertShown.current = patientId;
        Alert.alert(
          'Adresse manquante',
          'Ce patient n’a pas d’adresse dans son dossier. Saisissez l’adresse de livraison ou complétez sa fiche patient.',
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    applyAddressFromProfile,
    fulfillmentMode,
    patientId,
    relativeId,
    selectedPatient?.address,
    selectedRelative,
  ]);

  useEffect(() => {
    if (!patientId) addressAlertShown.current = null;
  }, [patientId]);

  const sortedCatalog = useMemo(() => {
    const items = catalogQ.data ?? [];
    const fav = favoritesQ.data ?? new Set<string>();
    return [...items].sort((a, b) => {
      const af = fav.has(a.id) ? 1 : 0;
      const bf = fav.has(b.id) ? 1 : 0;
      if (af !== bf) return bf - af;
      return a.display_name.localeCompare(b.display_name, 'fr');
    });
  }, [catalogQ.data, favoritesQ.data]);

  const wizardSteps = isOwnPharmacy ? OWN_PHARMACY_WIZARD_STEPS : CATALOG_WIZARD_STEPS;
  const stepLabels = isOwnPharmacy
    ? ['Mode de retrait', 'Patient et adresse', 'Documents et récap']
    : ['Mode de retrait', 'Patient et adresse', 'Pharmacie', 'Documents et récap'];
  const displayStep = isOwnPharmacy && step === 4 ? 3 : step;

  const wizardBack = useCallback(() => {
    if (step <= 1) {
      router.back();
      return;
    }
    setStep((s) => (isOwnPharmacy && s === 4 ? 2 : s - 1));
  }, [isOwnPharmacy, router, step]);

  const validateStep = useCallback(
    (current: number): string | null => {
      if (current === 1) return null;
      if (current === 2) {
        if (!patientId.trim()) return 'Choisissez un patient.';
        if (fulfillmentMode === 'home_delivery' && !address?.label?.trim()) {
          return 'Adresse de livraison requise.';
        }
        if (isOwnPharmacy && !desiredDate) return 'Choisissez une date.';
        return null;
      }
      if (current === 3) {
        if (isOwnPharmacy) return null;
        if (!selectedPharmacyId) return 'Sélectionnez une pharmacie.';
        if (!desiredDate) return 'Choisissez une date.';
        const selectedDays =
          fulfillmentMode === 'home_delivery'
            ? selectedPharmacy?.home_delivery_days
            : selectedPharmacy?.click_collect_days;
        const weekday = new Date(`${desiredDate}T12:00:00`).getDay() || 7;
        if (selectedDays?.length && !selectedDays.includes(weekday)) {
          return 'La pharmacie n’est pas disponible à cette date.';
        }
        return null;
      }
      if (current === 4) return null;
      return null;
    },
    [address?.label, desiredDate, fulfillmentMode, isOwnPharmacy, patientId, selectedPharmacy, selectedPharmacyId],
  );

  const goNext = useCallback(() => {
    const err = validateStep(step);
    if (err) {
      toast(err, { type: 'error' });
      return;
    }
    if (step >= CATALOG_WIZARD_STEPS) return;
    setStep((s) => (isOwnPharmacy && s === 2 ? 4 : s + 1));
  }, [isOwnPharmacy, step, toast, validateStep]);

  const favoriteMut = useMutation({
    mutationFn: async ({ pharmacyId, favorite }: { pharmacyId: string; favorite: boolean }) => {
      setFavoritePendingId(pharmacyId);
      const res = favorite
        ? await removePharmacyFavorite(pharmacyId)
        : await addPharmacyFavorite(pharmacyId);
      if (!res.success) throw new Error(res.error ?? 'Favori impossible');
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.pharmacyOrders.favorites(userId) });
      await qc.invalidateQueries({ queryKey: queryKeys.pharmacyOrders.catalog(postalCode, fulfillmentMode) });
    },
    onError: (e) => handleApiError(e, toast, 'pharmacy-favorite'),
    onSettled: () => setFavoritePendingId(null),
  });

  const submitMut = useMutation({
    mutationFn: async () => {
      const err = validateStep(isOwnPharmacy ? 2 : 4);
      if (err) throw new Error(err);
      const pharmacyId = isOwnPharmacy ? userId : selectedPharmacyId;
      if (!pharmacyId) throw new Error('Pharmacie requise');

      let prescriptionDocumentIds: string[] = [];
      for (const rx of rxFiles) {
        if (isLocalFileRef(rx)) {
          const uploaded = await uploadMedicalDocument(
            { uri: rx.uri, fileName: rx.name, mimeType: rx.mimeType },
            {
              patient_id: patientId,
              relative_id: relativeId ?? undefined,
              document_type: 'ordonnance',
            },
          );
          if (!uploaded?.id) throw new Error('Upload ordonnance échoué');
          prescriptionDocumentIds.push(uploaded.id);
        } else if (isProfileDocRef(rx)) {
          prescriptionDocumentIds.push(rx.medical_document_id);
        }
      }

      const deliveryAddress =
        fulfillmentMode === 'home_delivery' && address
          ? {
              formatted_address: address.label,
              label: address.label,
              postal_code: address.postal_code,
              city: address.city,
              latitude: address.lat,
              longitude: address.lng,
            }
          : null;

      const res = await createPharmacyOrder({
        patient_id: patientId,
        relative_id: relativeId,
        pharmacy_id: pharmacyId,
        fulfillment_mode: fulfillmentMode,
        delivery_address: deliveryAddress,
        desired_fulfillment_date: desiredDate,
        requester_comment: comment.trim() || null,
        prescription_document_ids: prescriptionDocumentIds,
      });
      if (!res.success || !res.data) throw new Error(res.error ?? 'Envoi impossible');
      return res.data;
    },
    onSuccess: (order) => {
      toast('Commande envoyée', { type: 'success' });
      void qc.invalidateQueries({ queryKey: queryKeys.pharmacyOrders.list('sent') });
      router.replace(`${rolePrefix}/commandes-pharmacie` as never);
    },
    onError: (e) => handleApiError(e, toast, 'pharmacy-order-create'),
  });

  const onConfirm = () => {
    if (step < CATALOG_WIZARD_STEPS) {
      goNext();
      return;
    }
    submitMut.mutate();
  };

  const ctaTitle = step < CATALOG_WIZARD_STEPS ? 'Continuer' : 'Envoyer la commande';

  const addPrescriptionPage = useCallback(async () => {
    if (rxFiles.length >= 10) {
      toast('Dix pages maximum', { type: 'error' });
      return;
    }
    const picked = await pickMedicalDocumentFile();
    if (!picked) return;
    setRxFiles((current) => [
      ...current,
      { uri: picked.uri, name: picked.fileName, mimeType: picked.mimeType },
    ]);
  }, [rxFiles.length, toast]);

  return (
    <StackChromeScreen
      title="Commande pharmacie"
      headerLeft={<StackHeaderBackButton onPress={wizardBack} />}
    >
      <FormScreen
        contentContainerStyle={scrollConfig.contentContainerStyle}
        {...spreadTabSceneScrollProps(scrollConfig)}
        backgroundColor={c.bookingCanvasLight}
        footer={
          <BookingActionBar
            title={ctaTitle}
            onPrimary={onConfirm}
            primaryLoading={submitMut.isPending}
            primaryDisabled={submitMut.isPending}
          />
        }
      >
        <BookingWizardProgress current={displayStep} total={wizardSteps} label={stepLabels[displayStep - 1]} />

        {step === 1 ? (
          <View style={styles.block}>
            <AppText style={styles.sectionLabel}>Comment souhaitez-vous récupérer les médicaments ?</AppText>
            <FullWidthSegmentBar
              segments={[
                { id: 'click_collect', label: PHARMACY_FULFILLMENT_LABELS.click_collect, Icon: Store },
                { id: 'home_delivery', label: PHARMACY_FULFILLMENT_LABELS.home_delivery, Icon: Home },
              ]}
              value={fulfillmentMode}
              onChange={(id) => setFulfillmentMode(id as PharmacyFulfillmentMode)}
            />
            <AppText style={styles.hint}>
              {fulfillmentMode === 'click_collect'
                ? 'Le patient se rendra en pharmacie pour retirer sa commande.'
                : 'La pharmacie livrera à l’adresse indiquée à l’étape suivante.'}
            </AppText>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.block}>
            {!initialPatientId ? <PrescriptionPatientSelectField
              patients={patients}
              selectedId={patientId}
              onSelect={(id) => {
                setPatientId(id);
                setRelativeId(null);
                setAddress(null);
                setAddressComplement('');
                addressAlertShown.current = null;
              }}
              loading={patientsQ.isLoading}
              totalCount={prescriptionPatientPickerTotalCount(patientsQ.data?.pages)}
              hasNextPage={patientsQ.hasNextPage}
              isFetchingNextPage={patientsQ.isFetchingNextPage}
              onLoadMore={() => void patientsQ.fetchNextPage()}
              label="Patient"
              placeholder="Choisir un patient…"
            /> : (
              <AppText style={styles.patientHint}>Patient présélectionné depuis sa fiche.</AppText>
            )}

            {patientId ? (
              <View style={styles.relativeBlock}>
                <AppText style={styles.sectionLabel}>Bénéficiaire de la commande</AppText>
                <Row wrap gap={spacing[2]} align="center">
                  <Pressable
                    onPress={() => setRelativeId(null)}
                    style={[styles.relativePill, !relativeId && styles.relativePillActive]}
                  >
                    <AppText style={[styles.relativePillText, !relativeId && styles.relativePillTextActive]}>
                      Titulaire
                    </AppText>
                  </Pressable>
                  {(relativesQ.data ?? []).map((r: PatientRelative) => {
                    const active = relativeId === r.id;
                    const label = personDisplayName(r.first_name, r.last_name, 'Proche');
                    return (
                      <Pressable
                        key={r.id}
                        onPress={() => setRelativeId(r.id)}
                        style={[styles.relativePill, active && styles.relativePillActive]}
                      >
                        <AppText style={[styles.relativePillText, active && styles.relativePillTextActive]}>
                          {label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                  <Pressable onPress={() => setRelativeSheetOpen(true)} style={styles.addRelativeBtn}>
                    <Row gap={4} align="center">
                      <Plus size={iconSize.xs} color={c.primary} strokeWidth={2.5} />
                      <AppText style={styles.addRelativeText}>Nouveau proche</AppText>
                    </Row>
                  </Pressable>
                </Row>
                {selectedPatient ? (
                  <AppText style={styles.patientHint}>
                    Dossier patient : {personDisplayName(selectedPatient.first_name, selectedPatient.last_name)}
                  </AppText>
                ) : null}
              </View>
            ) : null}

            {isOwnPharmacy ? (
              <AppText style={styles.hint}>
                Cette commande sera préparée par votre pharmacie.
              </AppText>
            ) : null}

            {fulfillmentMode === 'home_delivery' ? (
              <>
                <AddressAutocomplete
                  value={address}
                  complement={addressComplement}
                  onChange={setAddress}
                  onComplementChange={setAddressComplement}
                  label="Adresse de livraison"
                />
                {address?.label ? (
                  <AppText style={styles.hint}>
                    Appuyez sur ✕ pour modifier l’adresse.
                  </AppText>
                ) : null}
              </>
            ) : !isOwnPharmacy ? (
              <View style={styles.block}>
                <Input
                  label="Code postal (optionnel)"
                  value={postalCode}
                  onChangeText={(text) =>
                    setAddress((prev) => ({
                      label: prev?.label ?? '',
                      lat: prev?.lat ?? 0,
                      lng: prev?.lng ?? 0,
                      postal_code: text,
                      city: prev?.city,
                    }))
                  }
                  placeholder="Ex. 75001 — pour filtrer les pharmacies"
                  keyboardType="numeric"
                />
              </View>
            ) : null}

            <IsoDatePicker
              label="Date souhaitée"
              value={desiredDate}
              onChange={setDesiredDate}
              minimumDate={new Date()}
              maximumDate={new Date(Date.now() + 90 * 86400000)}
            />
          </View>
        ) : null}

        {step === 3 && !isOwnPharmacy ? (
          <View style={styles.block}>
            <AppText style={styles.sectionLabel}>Choisir une pharmacie</AppText>
            {catalogQ.isLoading ? (
              <ActivityIndicator color={c.primary} style={styles.loader} />
            ) : catalogQ.isError ? (
              <AppText style={styles.errorText}>
                {catalogQ.error instanceof Error ? catalogQ.error.message : 'Catalogue indisponible'}
              </AppText>
            ) : sortedCatalog.length === 0 ? (
              <AppText style={styles.hint}>Aucune pharmacie disponible pour ce mode et ce secteur.</AppText>
            ) : (
              <View style={styles.catalogList}>
                {sortedCatalog.map((item: PharmacyCatalogItem) => {
                  const fav = favoritesQ.data?.has(item.id) ?? item.is_favorite ?? false;
                  return (
                    <PharmacyCatalogCard
                      key={item.id}
                      item={item}
                      selected={selectedPharmacyId === item.id}
                      favorite={fav}
                      fulfillmentMode={fulfillmentMode}
                      favoriteLoading={favoritePendingId === item.id}
                      onPress={() => setSelectedPharmacyId(item.id)}
                      onToggleFavorite={() =>
                        favoriteMut.mutate({ pharmacyId: item.id, favorite: fav })
                      }
                    />
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        {step === 4 ? (
          <View style={styles.block}>
            <View style={styles.documentsBlock}>
              <AppText style={styles.sectionLabel}>Ordonnance (optionnel)</AppText>
              <AppText style={styles.hint}>
                Ajoutez toutes les pages, notamment pour une ordonnance recto-verso.
              </AppText>
              {rxFiles.map((file, index) => (
                <View key={`${index}-${isLocalFileRef(file) ? file.uri : file.medical_document_id}`} style={styles.documentRow}>
                  <AppText style={styles.documentName} numberOfLines={1}>
                    Page {index + 1} · {isLocalFileRef(file) ? file.name : file.file_name ?? 'Ordonnance'}
                  </AppText>
                  <Pressable
                    onPress={() => setRxFiles((current) => current.filter((_, i) => i !== index))}
                    hitSlop={8}
                  >
                    <Trash2 size={iconSize.sm} color={c.error} />
                  </Pressable>
                </View>
              ))}
              <Pressable onPress={() => void addPrescriptionPage()} style={styles.addDocumentButton}>
                <FilePlus2 size={iconSize.sm} color={c.primary} />
                <AppText style={styles.addDocumentText}>
                  {rxFiles.length ? 'Ajouter une autre page' : 'Ajouter une ordonnance'}
                </AppText>
              </Pressable>
            </View>

            <Input
              label="Commentaire pour la pharmacie (optionnel)"
              value={comment}
              onChangeText={setComment}
              placeholder="Informations utiles pour la préparation…"
              multiline
            />

            <View style={styles.recap}>
              <AppText style={styles.recapTitle}>Récapitulatif</AppText>
              <AppText style={styles.recapLine}>Mode : {pharmacyFulfillmentLabel(fulfillmentMode)}</AppText>
              {selectedPatient ? (
                <AppText style={styles.recapLine}>
                  Patient : {personDisplayName(selectedPatient.first_name, selectedPatient.last_name)}
                  {relativeId ? ' (proche)' : ''}
                </AppText>
              ) : null}
              {isOwnPharmacy ? (
                <AppText style={styles.recapLine}>Pharmacie : la vôtre</AppText>
              ) : selectedPharmacy ? (
                <AppText style={styles.recapLine}>Pharmacie : {selectedPharmacy.display_name}</AppText>
              ) : null}
              <AppText style={styles.recapLine}>Date souhaitée : {desiredDate}</AppText>
              {fulfillmentMode === 'home_delivery' && address?.label ? (
                <AppText style={styles.recapLine}>Livraison : {address.label}</AppText>
              ) : null}
            </View>
          </View>
        ) : null}
      </FormScreen>

      <RelativeQuickAddSheet
        visible={relativeSheetOpen}
        onClose={() => setRelativeSheetOpen(false)}
        patientId={patientId}
        staffConsent
        onCreated={(id) => {
          setRelativeId(id);
          void relativesQ.refetch();
        }}
      />
    </StackChromeScreen>
  );
}

function buildStyles(c: AppColors) {
  return {
    formContent: {
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[4],
      gap: spacing[4],
    },
    block: { gap: spacing[3] },
    sectionLabel: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.md,
      color: c.textPrimary,
    },
    hint: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.45,
    },
    errorText: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      color: c.error,
    },
    loader: { marginVertical: spacing[4] },
    relativeBlock: { gap: spacing[2] },
    relativePill: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    relativePillActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    relativePillText: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    relativePillTextActive: { color: c.textInverse },
    addRelativeBtn: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.primaryMid,
      borderStyle: 'dashed' as const,
    },
    addRelativeText: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.primary,
    },
    patientHint: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    documentsBlock: { gap: spacing[2] },
    documentRow: {
      // Layout interne compact d’une ligne de document.
      // eslint-disable-next-line oneandlab/no-raw-flex-row
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[2],
      padding: spacing[3],
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    documentName: {
      flex: 1,
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    addDocumentButton: {
      minHeight: 48,
      // Pressable composite ; Row ne peut pas porter l’interaction.
      // eslint-disable-next-line oneandlab/no-raw-flex-row
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing[2],
      borderRadius: radius.md,
      borderWidth: 1,
      borderStyle: 'dashed' as const,
      borderColor: c.primary,
      backgroundColor: c.primaryLight,
    },
    addDocumentText: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.primary,
    },
    catalogList: { gap: spacing[2] },
    recap: {
      padding: spacing[3],
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      gap: spacing[1],
    },
    recapTitle: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
      marginBottom: spacing[1],
    },
    recapLine: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.45,
    },
  };
}

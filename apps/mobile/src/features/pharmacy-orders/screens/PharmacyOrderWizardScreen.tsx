import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FilePlus2, Home, Plus, Store, Trash2 } from 'lucide-react-native';
import type { PharmacyCatalogItem, PharmacyFulfillmentMode } from '@oneandlab/shared-types';
import { PHARMACY_FULFILLMENT_LABELS } from '@oneandlab/shared-constants';
import { createAppointmentRequestId } from '@oneandlab/shared-utils';
import { FormScreen } from '@/components/layout/FormScreen';
import { Row } from '@/components/layout/primitives';
import { FullWidthSegmentBar } from '@/components/ui/FullWidthSegmentBar';
import { Input } from '@/components/ui/Input';
import { buildFieldStyles } from '@/components/ui/field-styles';
import { BookingActionBar } from '@/features/appointments/form/components/BookingActionBar';
import { BookingWizardProgress } from '@/features/appointments/form/components/BookingWizardProgress';
import { RelativeQuickAddSheet } from '@/features/appointments/form/components/RelativeQuickAddSheet';
import type { DocumentFileRef } from '@/features/appointments/form/types/document-file-ref';
import { isLocalFileRef } from '@/features/appointments/form/types/document-file-ref';
import { medicalDocumentPickErrorMessage } from '@/lib/uploads/pick-medical-document';
import { AddressAutocomplete } from '@/features/address/components/AddressAutocomplete';
import type { AddressPayload } from '@/features/appointments/form/types';
import { PrescriptionPatientSelectField } from '@/features/prescriptions/components/PrescriptionPatientSelectField';
import {
  flattenPrescriptionPickerPatients,
  prescriptionPatientPickerTotalCount,
  usePrescriptionPatientPickerInfinite,
} from '@/features/prescriptions/hooks/use-prescription-patient-picker-infinite';
import {
  fetchPatientRelative,
  fetchPatientRelatives,
  type PatientRelative,
} from '@/features/patient-relatives/api/patient-relatives.service';
import { fetchUser } from '@/features/profile/api/profile.service';
import { resolvePatientAddressForRdvForm } from '@/utils/patient-address-rdv';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { UnsavedChangesGuard } from '@/features/profile/components/UnsavedChangesGuard';
import { HeaderBackButton } from '@/navigation/HeaderBackButton';
import { pharmacyOrdersListHref } from '@/navigation/role-hrefs';
import type { StaffRoutePrefix } from '@/navigation/role-route-prefix';
import { PharmacyCatalogCard } from '../components/PharmacyCatalogCard';
import { PharmacyPublicProfileSheet } from '../components/PharmacyPublicProfileSheet';
import { IsoDatePicker } from '@/features/nurse-passage/components/IsoDatePicker';
import {
  addPharmacyFavorite,
  createPharmacyOrder,
  fetchPharmacyCatalog,
  fetchPharmacyFavoriteIds,
  removePharmacyFavorite,
} from '../api/pharmacy-orders.service';
import { pickPrescriptionPage, uploadPrescriptionPages } from '../api/prescription-pages';
import { invalidatePharmacyOrders } from '../hooks/pharmacy-order-cache';
import { PharmacyOrderCreationAttempt } from '../utils/pharmacy-order-creation-attempt';
import {
  formatPharmacyDesiredDate,
  personDisplayName,
  pharmacyFulfillmentLabel,
} from '../utils/order-display';
import { usePharmacyModuleEnabled } from '../hooks/use-pharmacy-module-enabled';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconActionButton } from '@/components/ui/IconActionButton';
import {
  ICON_STROKE_WIDTH,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
  iconSize,
  AppText,
  useStyles,
  font,
  type Theme,
} from '@/theme';

const CATALOG_WIZARD_STEPS = 4;

/** Le soignant commande pour un patient ; le patient commande pour lui ou l'un de ses proches. */
const WIZARD_COPY = {
  staff: {
    beneficiaryStep: 'Patient et adresse',
    holder: 'Titulaire',
    collectHint: 'Le patient se rendra en pharmacie pour retirer sa commande.',
    missingAddress: 'Aucune adresse dans le dossier du patient : saisissez l’adresse de livraison.',
    missingRelativeAddress:
      'Aucune adresse trouvée pour ce proche ni pour le titulaire : saisissez l’adresse de livraison.',
  },
  patient: {
    beneficiaryStep: 'Bénéficiaire et adresse',
    holder: 'Moi',
    collectHint: 'Vous retirerez la commande en pharmacie.',
    missingAddress: 'Aucune adresse dans votre profil : saisissez l’adresse de livraison.',
    missingRelativeAddress:
      'Aucune adresse trouvée pour ce proche ni dans votre profil : saisissez l’adresse de livraison.',
  },
} as const;

interface Props {
  rolePrefix: StaffRoutePrefix | '/(patient)';
  initialPatientId?: string;
}

export function PharmacyOrderWizardScreen({ rolePrefix, initialPatientId }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const field = useStyles(buildFieldStyles);
  const router = useRouter();
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const { isOwnPharmacy } = usePharmacyModuleEnabled();
  const isPatient = rolePrefix === '/(patient)';
  const copy = WIZARD_COPY[isPatient ? 'patient' : 'staff'];
  const fixedPatientId = isPatient ? userId : initialPatientId;

  const [step, setStep] = useState(1);
  const [fulfillmentMode, setFulfillmentMode] = useState<PharmacyFulfillmentMode>('click_collect');
  const [patientId, setPatientId] = useState(fixedPatientId ?? '');
  const [relativeId, setRelativeId] = useState<string | null>(null);
  const [address, setAddress] = useState<AddressPayload | null>(null);
  const [addressComplement, setAddressComplement] = useState('');
  const [selectedPharmacyId, setSelectedPharmacyId] = useState('');
  const [profilePharmacyId, setProfilePharmacyId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [rxFiles, setRxFiles] = useState<DocumentFileRef[]>([]);
  const [desiredDate, setDesiredDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [relativeSheetOpen, setRelativeSheetOpen] = useState(false);
  const [favoritePendingId, setFavoritePendingId] = useState<string | null>(null);
  const [showOtherPharmacies, setShowOtherPharmacies] = useState(false);

  const [addressMissing, setAddressMissing] = useState(false);
  const addressLabelRef = useRef('');

  const patientsQ = usePrescriptionPatientPickerInfinite(!isPatient);
  const patients = useMemo(
    () => flattenPrescriptionPickerPatients(patientsQ.data?.pages),
    [patientsQ.data?.pages],
  );
  useEffect(() => {
    if (fixedPatientId) setPatientId(fixedPatientId);
  }, [fixedPatientId]);

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
    queryKey: queryKeys.pharmacyOrders.catalog(postalCode, fulfillmentMode, patientId),
    queryFn: async () => {
      const res = await fetchPharmacyCatalog({
        postal_code: postalCode || undefined,
        fulfillment_mode: fulfillmentMode,
        patient_id: patientId || undefined,
      });
      if (!res.success || !res.data) throw new Error(res.error ?? 'Catalogue indisponible');
      return res.data;
    },
    enabled: !!patientId && step >= 3,
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
    setShowOtherPharmacies(false);
  }, [patientId]);

  useEffect(() => {
    if (isOwnPharmacy && userId) {
      setSelectedPharmacyId(userId);
      return;
    }
    if (selectedPharmacyId) return;
    const primary = (catalogQ.data ?? []).find((item) => item.is_patient_pharmacy);
    if (primary) setSelectedPharmacyId(primary.id);
  }, [catalogQ.data, isOwnPharmacy, selectedPharmacyId, userId]);

  const selectedPatient = patients.find((p) => p.id === patientId);

  const initialPatientQ = useQuery({
    queryKey: queryKeys.profile.user(initialPatientId ?? ''),
    queryFn: async () => (await fetchUser(initialPatientId ?? '')).data,
    enabled: !!initialPatientId,
  });
  const patientName = selectedPatient
    ? personDisplayName(selectedPatient.first_name, selectedPatient.last_name)
    : initialPatientQ.data
      ? personDisplayName(initialPatientQ.data.first_name, initialPatientQ.data.last_name)
      : null;
  const selectedPharmacy = catalogQ.data?.find((p) => p.id === selectedPharmacyId);
  const selectedRelative = (relativesQ.data ?? []).find((r) => r.id === relativeId);
  const missingAddressError =
    addressMissing && !address?.label?.trim()
      ? relativeId
        ? copy.missingRelativeAddress
        : copy.missingAddress
      : undefined;

  useEffect(() => {
    addressLabelRef.current = address?.label?.trim() ?? '';
  }, [address?.label]);

  const applyAddressIfResolvable = useCallback(async (raw: unknown): Promise<boolean> => {
    const resolved = await resolvePatientAddressForRdvForm(raw);
    if (!resolved?.label?.trim()) return false;
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
    setAddressMissing(false);
    if (!patientId || fulfillmentMode !== 'home_delivery') return;
    let cancelled = false;

    void (async () => {
      const sources: unknown[] = [];

      try {
        if (relativeId) {
          let rel: PatientRelative | undefined = selectedRelative;
          const listHasAddress = Boolean(rel?.address?.label?.trim());
          if (!listHasAddress) {
            try {
              const res = await fetchPatientRelative(relativeId, patientId);
              if (res.success && res.data) rel = res.data;
            } catch (error) {
              if (__DEV__) console.warn('[pharmacy-wizard] fiche proche indisponible, liste locale utilisée', error);
            }
          }
          if (rel?.address) sources.push(rel.address);
        }
        if (selectedPatient?.address) sources.push(selectedPatient.address);
        const profile = await fetchUser(patientId);
        if (cancelled) return;
        if (profile.data?.address) sources.push(profile.data.address);

        for (const raw of sources) {
          if (cancelled) return;
          if (await applyAddressIfResolvable(raw)) return;
        }
      } catch (error) {
        if (__DEV__) console.warn('[pharmacy-wizard] préremplissage de l’adresse impossible', error);
      }
      if (cancelled) return;

      if (addressLabelRef.current) return;
      setAddressMissing(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    applyAddressIfResolvable,
    fulfillmentMode,
    patientId,
    relativeId,
    selectedPatient?.address,
    selectedRelative,
  ]);

  const sortedCatalog = useMemo(() => {
    const items = catalogQ.data ?? [];
    const fav = favoritesQ.data ?? new Set<string>();
    return [...items].sort((a, b) => {
      const ap = a.is_patient_pharmacy ? 0 : 1;
      const bp = b.is_patient_pharmacy ? 0 : 1;
      if (ap !== bp) return ap - bp;
      const af = fav.has(a.id) ? 1 : 0;
      const bf = fav.has(b.id) ? 1 : 0;
      if (af !== bf) return bf - af;
      return a.display_name.localeCompare(b.display_name, 'fr');
    });
  }, [catalogQ.data, favoritesQ.data]);

  const patientPharmacies = sortedCatalog.filter((item) => item.is_patient_pharmacy);
  const visibleCatalog =
    patientPharmacies.length > 0 && !showOtherPharmacies ? patientPharmacies : sortedCatalog;

  const wizardSteps = isOwnPharmacy ? 3 : CATALOG_WIZARD_STEPS;
  const stepLabels = isOwnPharmacy
    ? ['Mode de retrait', copy.beneficiaryStep, 'Documents et récap']
    : ['Mode de retrait', copy.beneficiaryStep, 'Pharmacie', 'Documents et récap'];
  const displayStep = isOwnPharmacy && step === 4 ? 3 : step;

  const wizardBack = useCallback(() => {
    if (step <= 1) {
      router.back();
      return;
    }
    if (isOwnPharmacy && step === 4) {
      setStep(2);
      return;
    }
    setStep((s) => s - 1);
  }, [isOwnPharmacy, router, step]);

  const validateStep = useCallback(
    (current: number): string | null => {
      if (current === 1) return null;
      if (current === 2) {
        if (!patientId.trim()) return 'Choisissez un patient.';
        if (fulfillmentMode === 'home_delivery' && !address?.label?.trim()) {
          return 'Adresse de livraison requise.';
        }
        if (!desiredDate) return 'Choisissez une date.';
        return null;
      }
      if (current === 3) {
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
    [address?.label, desiredDate, fulfillmentMode, patientId, selectedPharmacy, selectedPharmacyId],
  );

  const goNext = useCallback(() => {
    const err = validateStep(step);
    if (err) {
      toast(err, { type: 'error' });
      return;
    }
    if (step >= CATALOG_WIZARD_STEPS) return;
    if (isOwnPharmacy && step === 2) {
      setStep(4);
      return;
    }
    setStep((s) => s + 1);
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
      await qc.invalidateQueries({ queryKey: queryKeys.pharmacyOrders.catalog(postalCode, fulfillmentMode, patientId) });
    },
    onError: (e) => handleApiError(e, toast, 'pharmacy-favorite'),
    onSettled: () => setFavoritePendingId(null),
  });

  const submitLockedRef = useRef(false);
  const creationAttempt = useRef(new PharmacyOrderCreationAttempt(createAppointmentRequestId));
  const submitMut = useMutation({
    mutationFn: async () => {
      const err = validateStep(isOwnPharmacy ? 2 : 4);
      if (err) throw new Error(err);
      const pharmacyId = selectedPharmacyId;
      if (!pharmacyId) throw new Error('Pharmacie requise');

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

      const owner = { patientId, relativeId };
      const res = await creationAttempt.current.run(
        [owner, rxFiles],
        () => uploadPrescriptionPages(rxFiles, owner),
        {
          patient_id: patientId,
          relative_id: relativeId,
          pharmacy_id: pharmacyId,
          fulfillment_mode: fulfillmentMode,
          delivery_address: deliveryAddress,
          desired_fulfillment_date: desiredDate,
          requester_comment: comment.trim() || null,
        },
        createPharmacyOrder,
      );
      if (!res.success || !res.data) throw new Error(res.error ?? 'Envoi impossible');
      return res.data;
    },
    onSuccess: () => {
      toast('Commande envoyée', { type: 'success' });
      void invalidatePharmacyOrders(qc);
      router.dismissTo(pharmacyOrdersListHref(rolePrefix));
    },
    onError: (e) => {
      submitLockedRef.current = false;
      handleApiError(e, toast, 'pharmacy-order-create');
    },
  });

  const onConfirm = () => {
    if (step < CATALOG_WIZARD_STEPS) {
      goNext();
      return;
    }
    if (submitLockedRef.current) return;
    submitLockedRef.current = true;
    submitMut.mutate();
  };

  const ctaTitle = step < CATALOG_WIZARD_STEPS ? 'Continuer' : 'Envoyer la commande';
  const hasDraft = step > 1 || rxFiles.length > 0 || comment.trim() !== '';

  const addPrescriptionPage = useCallback(async () => {
    if (rxFiles.length >= 10) {
      toast('Dix pages maximum', { type: 'error' });
      return;
    }
    try {
      const page = await pickPrescriptionPage();
      if (page) setRxFiles((current) => [...current, page]);
    } catch (e) {
      toast(medicalDocumentPickErrorMessage(e), { type: 'error' });
    }
  }, [rxFiles.length, toast]);

  return (
    <StackChromeScreen headerLeft={<HeaderBackButton onPress={wizardBack} />}>
      <FormScreen
        contentContainerStyle={styles.formContent}
        backgroundColor={c.background}
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
                ? copy.collectHint
                : 'La pharmacie livrera à l’adresse indiquée à l’étape suivante.'}
            </AppText>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.block}>
            {!fixedPatientId ? <PrescriptionPatientSelectField
              patients={patients}
              selectedId={patientId}
              onSelect={(id) => {
                setPatientId(id);
                setRelativeId(null);
                setAddress(null);
                setAddressComplement('');
              }}
              loading={patientsQ.isLoading}
              totalCount={prescriptionPatientPickerTotalCount(patientsQ.data?.pages)}
              hasNextPage={patientsQ.hasNextPage}
              isFetchingNextPage={patientsQ.isFetchingNextPage}
              onLoadMore={() => void patientsQ.fetchNextPage()}
              label="Patient"
              placeholder="Choisir un patient…"
            /> : !isPatient && patientName ? (
              <View style={styles.fixedPatient}>
                <AppText variant="caption">Patient</AppText>
                <AppText variant="body">{patientName}</AppText>
              </View>
            ) : null}

            {patientId ? (
              <View style={styles.relativeBlock}>
                <AppText style={field.label}>Bénéficiaire de la commande</AppText>
                <Row wrap gap={spacing[2]} align="center">
                  <Pressable
                    onPress={() => setRelativeId(null)}
                    style={[styles.relativePill, !relativeId && styles.relativePillActive]}
                  >
                    <AppText style={[styles.relativePillText, !relativeId && styles.relativePillTextActive]}>
                      {copy.holder}
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
                  <Pressable
                    onPress={() => setRelativeSheetOpen(true)}
                    style={styles.addRelativeBtn}
                    accessibilityRole="button"
                  >
                    <Row gap={spacing[1]} align="center">
                      <Plus size={iconSize.sm} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} />
                      <AppText style={styles.addRelativeText}>Nouveau proche</AppText>
                    </Row>
                  </Pressable>
                </Row>
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
                  error={missingAddressError}
                />
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
              <ErrorState
                title="Pharmacies indisponibles"
                error={catalogQ.error}
                onRetry={() => void catalogQ.refetch()}
              />
            ) : visibleCatalog.length === 0 ? (
              <AppText variant="secondary">Aucune pharmacie disponible pour ce mode et ce secteur.</AppText>
            ) : (
              <View style={styles.catalogList}>
                {visibleCatalog.map((item: PharmacyCatalogItem) => {
                  const fav = favoritesQ.data?.has(item.id) ?? item.is_favorite ?? false;
                  return (
                    <PharmacyCatalogCard
                      key={item.id}
                      item={item}
                      selected={selectedPharmacyId === item.id}
                      favorite={fav}
                      favoriteLoading={favoritePendingId === item.id}
                      onPress={() => setSelectedPharmacyId(item.id)}
                      onViewProfile={() => setProfilePharmacyId(item.id)}
                      onToggleFavorite={() =>
                        favoriteMut.mutate({ pharmacyId: item.id, favorite: fav })
                      }
                    />
                  );
                })}
                {patientPharmacies.length > 0 && !showOtherPharmacies && sortedCatalog.length > patientPharmacies.length ? (
                  <Pressable
                    onPress={() => setShowOtherPharmacies(true)}
                    accessibilityRole="button"
                    style={styles.addRelativeBtn}
                  >
                    <AppText style={styles.addRelativeText}>Voir les autres pharmacies</AppText>
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>
        ) : null}

        {step === 4 ? (
          <View style={styles.block}>
            <View style={styles.documentsBlock}>
              <AppText style={field.label}>Ordonnance (optionnel)</AppText>
              <AppText variant="secondary">Ajoutez toutes les pages, recto-verso compris.</AppText>
              {rxFiles.map((file, index) => (
                <View key={`${index}-${isLocalFileRef(file) ? file.uri : file.medical_document_id}`} style={styles.documentRow}>
                  <AppText style={styles.documentName}>
                    Page {index + 1} · {isLocalFileRef(file) ? file.name : file.file_name ?? 'Ordonnance'}
                  </AppText>
                  <IconActionButton
                    label={`Retirer la page ${index + 1}`}
                    onPress={() => setRxFiles((current) => current.filter((_, i) => i !== index))}
                  >
                    <Trash2 size={iconSize.md} color={c.error} strokeWidth={ICON_STROKE_WIDTH} />
                  </IconActionButton>
                </View>
              ))}
              <Pressable
                onPress={() => void addPrescriptionPage()}
                style={styles.addDocumentButton}
                accessibilityRole="button"
              >
                <FilePlus2 size={iconSize.md} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} />
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
              {isPatient ? (
                <AppText style={styles.recapLine}>
                  Pour :{' '}
                  {selectedRelative
                    ? personDisplayName(selectedRelative.first_name, selectedRelative.last_name, 'un proche')
                    : copy.holder}
                </AppText>
              ) : patientName ? (
                <AppText style={styles.recapLine}>
                  Patient : {patientName}
                  {selectedRelative
                    ? ` · pour ${personDisplayName(selectedRelative.first_name, selectedRelative.last_name, 'un proche')}`
                    : ''}
                </AppText>
              ) : null}
              {isOwnPharmacy ? (
                <AppText style={styles.recapLine}>Pharmacie : la vôtre</AppText>
              ) : selectedPharmacy ? (
                <AppText style={styles.recapLine}>Pharmacie : {selectedPharmacy.display_name}</AppText>
              ) : null}
              <AppText style={styles.recapLine}>Date souhaitée : {formatPharmacyDesiredDate(desiredDate)}</AppText>
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
        staffConsent={!isPatient}
        onCreated={(id) => {
          setRelativeId(id);
          void relativesQ.refetch();
        }}
      />
      <PharmacyPublicProfileSheet
        pharmacyId={profilePharmacyId}
        title={catalogQ.data?.find((item) => item.id === profilePharmacyId)?.display_name}
        onClose={() => setProfilePharmacyId(null)}
      />
      <UnsavedChangesGuard dirty={hasDraft && !submitMut.isPending && !submitMut.isSuccess} />
    </StackChromeScreen>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    formContent: {
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[4],
      gap: spacing[4],
    },
    block: { gap: spacing[3] },
    sectionLabel: {
      ...font.semiBold,
      fontSize: fontSize.md,
      color: c.textPrimary,
    },
    hint: {
      ...font.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.45,
    },
    loader: { marginVertical: spacing[4] },
    fixedPatient: { gap: spacing[0.5] },
    relativeBlock: { gap: spacing[2] },
    relativePill: {
      minHeight: MIN_TOUCH_TARGET,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing[4],
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
      ...font.medium,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    relativePillTextActive: { color: c.textInverse },
    addRelativeBtn: {
      minHeight: MIN_TOUCH_TARGET,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing[4],
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.primaryMid,
      borderStyle: 'dashed' as const,
    },
    addRelativeText: {
      ...font.semiBold,
      fontSize: fontSize.sm,
      color: c.primary,
    },
    documentsBlock: { gap: spacing[2] },
    documentRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[2],
      paddingVertical: spacing[1],
      paddingLeft: spacing[3],
      paddingRight: spacing[1],
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    documentName: {
      flex: 1,
      minWidth: 0,
      ...font.medium,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    addDocumentButton: {
      minHeight: MIN_TOUCH_TARGET,
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
      ...font.semiBold,
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
      ...font.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
      marginBottom: spacing[1],
    },
    recapLine: {
      ...font.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.45,
    },
  };
}

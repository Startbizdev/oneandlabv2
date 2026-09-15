import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AddressPayload } from '../types';
import { fetchUser, updateUser } from '@/features/profile/api/profile.service';
import { updatePatient } from '@/features/patients/api/patients.service';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import {
  parseRawPatientAddress,
  resolvePatientAddressForRdvForm,
} from '@/utils/patient-address-rdv';

function addressBodyForApi(
  addr: AddressPayload | null,
  complement: string,
): Record<string, unknown> | null {
  if (!addr?.label?.trim()) return null;
  return {
    label: addr.label.trim(),
    lat: Number(addr.lat),
    lng: Number(addr.lng),
    ...(complement.trim() ? { complement: complement.trim() } : {}),
  };
}

interface Options {
  /** ID utilisateur/patient dont le profil doit être synchronisé (null = pas de sync). */
  getProfileId: () => string | null;
  /** true → PUT /users/:id + refresh session ; false → PUT /patients/:id */
  isPatientSelf: boolean;
  setFormAddress: (addr: AddressPayload | null) => void;
  getFormAddress: () => AddressPayload | null;
  addressComplement: string;
  setAddressComplement: (v: string) => void;
}

export function useProfileAddressSync({
  getProfileId,
  isPatientSelf,
  setFormAddress,
  getFormAddress,
  addressComplement,
  setAddressComplement,
}: Options) {
  const qc = useQueryClient();
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const hydratingRef = useRef(false);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeProfileId = getProfileId();
  const activeProfileRef = useRef(activeProfileId);
  activeProfileRef.current = activeProfileId;
  const addressVersion = useRef(0);
  useEffect(() => {
    hydratingRef.current = false;
    const version = addressVersion;
    return () => {
      version.current++;
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [activeProfileId]);

  const applyFromRaw = useCallback(
    async (raw: unknown, expectedProfileId = activeProfileRef.current) => {
      const version = ++addressVersion.current;
      hydratingRef.current = true;
      try {
        const resolved = await resolvePatientAddressForRdvForm(raw);
        if (version !== addressVersion.current || expectedProfileId !== activeProfileRef.current) return;
        const parsed = parseRawPatientAddress(raw);
        if (resolved) {
          const nextAddr: AddressPayload = {
            label: resolved.label,
            lat: resolved.lat,
            lng: resolved.lng,
            city: undefined,
            postal_code: undefined,
          };
          const nextComplement = parsed?.complement ?? resolved.complement ?? '';
          const prev = getFormAddress();
          if (
            !prev ||
            prev.label !== nextAddr.label ||
            prev.lat !== nextAddr.lat ||
            prev.lng !== nextAddr.lng
          ) {
            setFormAddress(nextAddr);
          }
          if (addressComplement !== nextComplement) {
            setAddressComplement(nextComplement);
          }
        } else {
          if (getFormAddress() !== null) setFormAddress(null);
          if (addressComplement !== '') setAddressComplement('');
        }
      } finally {
        if (version === addressVersion.current) hydratingRef.current = false;
      }
    },
    [setFormAddress, setAddressComplement, getFormAddress, addressComplement],
  );

  const loadProfileAddress = useCallback(
    async (profileId: string) => {
      try {
        const cached = qc.getQueryData<{ address?: unknown }>(queryKeys.profile.user(profileId));
        const cachedLabel = parseRawPatientAddress(cached?.address)?.label?.trim();
        if (cached && cachedLabel) {
          await applyFromRaw(cached.address, profileId);
          return;
        }
        const res = await fetchUser(profileId, 'mobile');
        if (res.success && res.data) {
          qc.setQueryData(queryKeys.profile.user(profileId), res.data);
          await applyFromRaw((res.data as { address?: unknown }).address, profileId);
        }
      } catch {
        /* silencieux */
      }
    },
    [applyFromRaw, qc],
  );

  const persistToProfile = useCallback(
    async (addr: AddressPayload | null, complement: string, expectedProfileId: string | null) => {
      if (hydratingRef.current) return;
      const profileId = getProfileId();
      if (!profileId || profileId !== expectedProfileId || profileId !== activeProfileRef.current) return;
      const body = addressBodyForApi(addr, complement);
      if (!body) return;
      try {
        if (isPatientSelf) {
          const res = await updateUser(profileId, { address: body });
          if (res.success) await fetchMe();
        } else {
          await updatePatient(profileId, { address: body });
          void qc.invalidateQueries({ queryKey: queryKeys.patients.list() });
        }
      } catch {
        /* silencieux — le RDV garde la valeur locale */
      }
    },
    [getProfileId, isPatientSelf, fetchMe, qc],
  );

  const schedulePersist = useCallback(
    (addr: AddressPayload | null, complement: string) => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      const expectedProfileId = activeProfileRef.current;
      persistTimerRef.current = setTimeout(() => {
        persistTimerRef.current = null;
        void persistToProfile(addr, complement, expectedProfileId);
      }, 550);
    },
    [persistToProfile],
  );

  const onAddressChange = useCallback(
    (addr: AddressPayload | null) => {
      setFormAddress(addr);
      schedulePersist(addr, addressComplement);
    },
    [setFormAddress, schedulePersist, addressComplement],
  );

  const onComplementChange = useCallback(
    (complement: string) => {
      setAddressComplement(complement);
      schedulePersist(getFormAddress(), complement);
    },
    [setAddressComplement, schedulePersist, getFormAddress],
  );

  return {
    applyFromRaw,
    loadProfileAddress,
    onAddressChange,
    onComplementChange,
  };
}

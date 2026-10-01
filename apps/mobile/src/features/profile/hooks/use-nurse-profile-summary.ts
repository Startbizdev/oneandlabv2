import { useQuery } from '@tanstack/react-query';
import {
  fetchCoverageZones,
  fetchNurseCategoryPreferences,
  fetchUser,
} from '@/features/profile/api/profile.service';
import { parseNurseQualificationsFromApi } from '@/constants/nurse-qualifications';
import { parseProfileAddress } from '@/features/profile/utils/parse-profile-address';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';

export function useNurseProfileSummary() {
  const user = useAuthStore((s) => s.user);

  const profileQ = useQuery({
    queryKey: queryKeys.profile.fullUser(user?.id ?? ''),
    queryFn: async () => (await fetchUser(user!.id, 'full')).data,
    enabled: !!user?.id,
  });

  const prefsQ = useQuery({
    queryKey: queryKeys.profile.nursePreferences,
    queryFn: async () => {
      const res = await fetchNurseCategoryPreferences();
      return res.data ?? [];
    },
    enabled: !!user?.id,
  });

  const zoneQ = useQuery({
    queryKey: queryKeys.profile.coverageZones(user?.id ?? '', 'nurse'),
    queryFn: async () => {
      const res = await fetchCoverageZones(user!.id, 'nurse');
      return res.data ?? [];
    },
    enabled: !!user?.id,
  });

  const d = profileQ.data;
  const addr = parseProfileAddress(d?.address);
  const { codes } = parseNurseQualificationsFromApi(
    (d as { nurse_qualifications?: unknown } | undefined)?.nurse_qualifications,
  );
  const qualCount = codes.filter((c) => c !== 'AUTRE').length;
  const prefs = prefsQ.data ?? [];
  const enabledCare = prefs.filter((p) => Boolean(p.is_enabled)).length;
  const radius = zoneQ.data?.[0]?.radius_km;

  return {
    coordinatesSubtitle: d ? (addr?.label ?? 'Adresse à compléter') : '—',
    presentationSubtitle: d
      ? [
          d.is_public_profile_enabled ? 'Fiche publique' : 'Fiche privée',
          d.is_accepting_appointments !== false && d.is_accepting_appointments !== 0
            ? 'RDV ouverts'
            : 'RDV en pause',
        ].join(' · ')
      : '—',
    qualificationsSubtitle:
      qualCount > 0
        ? `${qualCount} diplôme${qualCount > 1 ? 's' : ''} sélectionné${qualCount > 1 ? 's' : ''}`
        : 'Aucun diplôme sélectionné',
    careTypesSubtitle:
      prefs.length > 0
        ? `${enabledCare} soin${enabledCare > 1 ? 's' : ''} actif${enabledCare > 1 ? 's' : ''} sur ${prefs.length}`
        : 'Configurer vos soins',
    coverageSubtitle: radius != null ? `Rayon de ${radius} km` : addr?.label ? 'Adresse définie' : 'À configurer',
  };
}

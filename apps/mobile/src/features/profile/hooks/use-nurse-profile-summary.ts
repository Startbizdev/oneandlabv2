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

const YEARS_LABELS: Record<string, string> = {
  '1': '1 an',
  '3': '3 ans',
  '5': '5 ans',
  '10': '10 ans',
  '10_plus': 'Plus de 10 ans',
};

export function useNurseProfileSummary() {
  const user = useAuthStore((s) => s.user);

  const profileQ = useQuery({
    queryKey: queryKeys.profile.user(user?.id ?? ''),
    queryFn: async () => (await fetchUser(user!.id)).data,
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
    isLoading: profileQ.isLoading,
    coordinatesSubtitle: d
      ? [d.first_name, d.last_name].filter(Boolean).join(' ') || 'À compléter'
      : '—',
    presentationSubtitle: d
      ? [
          d.biography?.trim() ? 'Biographie renseignée' : 'Biographie à compléter',
          d.years_experience
            ? YEARS_LABELS[d.years_experience] ?? d.years_experience
            : 'Expérience non renseignée',
          d.is_public_profile_enabled ? 'Fiche publique active' : 'Fiche privée',
          d.is_accepting_appointments !== false && d.is_accepting_appointments !== 0
            ? 'RDV ouverts'
            : 'Pause RDV',
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
    yearsLabel: d?.years_experience ? YEARS_LABELS[d.years_experience] ?? d.years_experience : null,
  };
}

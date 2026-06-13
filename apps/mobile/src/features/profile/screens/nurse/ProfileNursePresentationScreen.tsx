import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/Input';
import { ProfileToggleRow } from '@/features/profile/components/ProfileToggleRow';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';
import { fetchUser, updateUser } from '@/features/profile/api/profile.service';
import { generateNursePublicSlug } from '@/features/profile/utils/generate-public-slug';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const YEARS_OPTIONS = [
  { value: '1', label: '1 an' },
  { value: '3', label: '3 ans' },
  { value: '5', label: '5 ans' },
  { value: '10', label: '10 ans' },
  { value: '10_plus', label: 'Plus de 10 ans' },
];

export function ProfileNursePresentationScreen() {
  const styles = useThemedStyles(buildStyles, 'features_profile_screens_nurse_ProfileNursePresentationScreen_tsx_styles');
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();
  const qc = useQueryClient();

  const [biography, setBiography] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');

  const q = useQuery({
    queryKey: queryKeys.profile.user(user?.id ?? ''),
    queryFn: async () => (await fetchUser(user!.id, 'full')).data,
    enabled: !!user?.id,
  });

  useEffect(() => {
    const d = q.data;
    if (!d) return;
    setBiography(d.biography ?? '');
    setYearsExperience(d.years_experience ?? '');
  }, [q.data]);

  const savePresentation = useMutation({
    mutationFn: () =>
      updateUser(user!.id, {
        biography: biography.trim() || null,
        years_experience: yearsExperience || null,
      }),
    onSuccess: async () => {
      await fetchMe();
      void qc.invalidateQueries({ queryKey: queryKeys.profile.user(user!.id) });
      toast('Présentation enregistrée', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'updateUser'),
  });

  const saveToggle = useMutation({
    mutationFn: (body: {
      is_public_profile_enabled?: boolean;
      is_accepting_appointments?: boolean;
      public_slug?: string;
    }) => updateUser(user!.id, body),
    onSuccess: async () => {
      await fetchMe();
      void qc.invalidateQueries({ queryKey: queryKeys.profile.user(user!.id) });
      toast('Présentation mise à jour', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'updateUser'),
  });

  const publicEnabled = !!q.data?.is_public_profile_enabled;
  const accepting =
    q.data?.is_accepting_appointments !== false && q.data?.is_accepting_appointments !== 0;
  const busyToggle = saveToggle.isPending ? saveToggle.variables : null;

  return (
    <ProfileSubScreenLayout
      saving={savePresentation.isPending}
      onSave={() => savePresentation.mutate()}
      saveTitle="Enregistrer"
    >
      <Text style={styles.sectionKicker}>Texte & expérience</Text>
      <Input
        label="Biographie"
        value={biography}
        onChangeText={setBiography}
        multiline
        numberOfLines={5}
        style={{ minHeight: 120, textAlignVertical: 'top' as const }}
        placeholder="Présentez votre parcours et votre zone d'intervention…"
      />
      <Text style={styles.fieldLabel}>Années d&apos;expérience</Text>
      <Row wrap gap={spacing[2]}>
        {YEARS_OPTIONS.map((o) => (
          <Pressable key={o.value} onPress={() => setYearsExperience(o.value)}>
            <Text style={[styles.chip, yearsExperience === o.value && styles.chipActive]}>
              {o.label}
            </Text>
          </Pressable>
        ))}
      </Row>

      <Text style={[styles.sectionKicker, styles.sectionKickerSpaced]}>Visibilité & activité</Text>
      <View style={styles.card}>
        <ProfileToggleRow
          label="Fiche publique"
          hint={publicEnabled ? 'Visible sur Cary' : 'Non visible sur Cary'}
          value={publicEnabled}
          busy={busyToggle?.is_public_profile_enabled !== undefined}
          onValueChange={(v) => {
            const payload: {
              is_public_profile_enabled: boolean;
              public_slug?: string;
            } = { is_public_profile_enabled: v };
            if (v && !q.data?.public_slug?.trim()) {
              payload.public_slug = generateNursePublicSlug(
                q.data?.first_name ?? user?.first_name,
                q.data?.last_name ?? user?.last_name,
              );
            }
            saveToggle.mutate(payload);
          }}
        />
        <View style={styles.divider} />
        <ProfileToggleRow
          label="Accepter de nouveaux RDV"
          hint={accepting ? 'Vous recevez des demandes' : 'Pause activée'}
          value={accepting}
          busy={busyToggle?.is_accepting_appointments !== undefined}
          onValueChange={(v) => saveToggle.mutate({ is_accepting_appointments: v })}
        />
      </View>
    </ProfileSubScreenLayout>
  );
}

function buildStyles(c: AppColors) {
  return {
  sectionKicker: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
  sectionKickerSpaced: {
    marginTop: spacing[2],
  },
  fieldLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  chip: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.borderLight,
    backgroundColor: c.surfaceAlt,
  },
  chipActive: {
    color: c.primary,
    borderColor: c.primary,
    backgroundColor: c.primaryLight,
    fontFamily: fontFamily.semiBold,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: spacing[3],
    gap: spacing[1],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.borderLight,
    marginVertical: spacing[0.5],
  },
};
}


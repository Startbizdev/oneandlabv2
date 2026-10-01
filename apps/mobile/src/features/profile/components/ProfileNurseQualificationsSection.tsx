import { Fragment, useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { Input } from '@/components/ui/Input';
import { ListRowShell } from '@/components/ui/ListRowShell';
import { buildSettingsStyles } from '@/components/ui/SettingsRow';
import { SkeletonList } from '@/components/ui/skeletons';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { qualificationSaveOptions } from '@/features/profile/utils/qualification-save';
import { useProfileDraft } from '@/features/profile/hooks/useProfileDraft';
import { ProfileSection } from '@/features/profile/components/ProfileSection';
import {
  buildNurseQualificationsPayload,
  NURSE_QUALIFICATIONS,
  parseNurseQualificationsFromApi,
} from '@/constants/nurse-qualifications';
import { fetchUser, updateUser } from '@/features/profile/api/profile.service';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { useAppColors } from '@/theme/use-app-colors';
import { spacing, iconSize, ICON_STROKE_WIDTH, AppText, useStyles, type Theme } from '@/theme';

/** Diplômes affichés sur la fiche publique : enregistrés à chaque bascule (saisie libre avec délai). */
export function ProfileNurseQualificationsSection() {
  const c = useAppColors();
  const settings = useStyles(buildSettingsStyles);
  const styles = useStyles(buildStyles);
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();
  const qc = useQueryClient();

  const [qualificationCodes, setQualificationCodes] = useState<string[]>([]);
  const [otherFormations, setOtherFormations] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const otherDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = useQuery({
    queryKey: queryKeys.profile.fullUser(user?.id ?? ''),
    queryFn: async () => (await fetchUser(user!.id, 'full')).data,
    enabled: !!user?.id,
  });

  useProfileDraft(user?.id, q.data, { qualificationCodes, otherFormations },
    d => {
      const { codes, otherFormations: others } = parseNurseQualificationsFromApi(d.nurse_qualifications);
      return { qualificationCodes: codes, otherFormations: others.length ? others : codes.includes('AUTRE') ? [''] : [] };
    },
    d => { setQualificationCodes(d.qualificationCodes); setOtherFormations(d.otherFormations); setHydrated(true); },
  );

  const save = useMutation({
    ...qualificationSaveOptions(user?.id ?? '', () => useAuthStore.getState().user?.id,
      (userId, payload) => updateUser(userId, {
        nurse_qualifications: buildNurseQualificationsPayload(payload.codes, payload.others),
      })),
    onSuccess: async () => {
      if (useAuthStore.getState().user?.id !== user?.id) return;
      await fetchMe();
      void qc.invalidateQueries({ queryKey: queryKeys.profile.user(user!.id) });
      toast('Diplôme mis à jour', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'nurse-qualifications'),
  });

  const persist = useCallback(
    (codes: string[], others: string[]) => {
      if (otherDebounceRef.current) clearTimeout(otherDebounceRef.current);
      if (!hydrated || !user?.id || useAuthStore.getState().user?.id !== user.id) return;
      save.mutate({ codes, others });
    },
    [hydrated, user?.id, save],
  );

  const toggleQualification = (code: string, enabled: boolean) => {
    let nextCodes = qualificationCodes;
    let nextOthers = otherFormations;

    if (code === 'AUTRE') {
      if (enabled) {
        nextCodes = qualificationCodes.includes('AUTRE')
          ? qualificationCodes
          : [...qualificationCodes, 'AUTRE'];
        nextOthers = otherFormations.length ? otherFormations : [''];
      } else {
        nextCodes = qualificationCodes.filter((c) => c !== 'AUTRE');
        nextOthers = [];
      }
    } else {
      nextCodes = enabled
        ? qualificationCodes.includes(code)
          ? qualificationCodes
          : [...qualificationCodes, code]
        : qualificationCodes.filter((c) => c !== code);
    }

    setQualificationCodes(nextCodes);
    setOtherFormations(nextOthers);
    persist(nextCodes, nextOthers);
  };

  const scheduleOtherSave = (codes: string[], others: string[]) => {
    if (otherDebounceRef.current) clearTimeout(otherDebounceRef.current);
    otherDebounceRef.current = setTimeout(() => persist(codes, others), 600);
  };

  const showOtherFields =
    qualificationCodes.includes('AUTRE') || otherFormations.some((s) => s.trim().length > 0);

  const busy = save.isPending;

  if (q.isLoading) return <SkeletonList count={4} itemHeight={56} gap={spacing[2]} />;
  if (q.isError || !q.data) {
    return <ErrorState title="Diplômes indisponibles" error={q.error} onRetry={() => void q.refetch()} />;
  }

  return (
    <>
      {save.isError ? (
        <Button
          title="Réessayer l’enregistrement"
          loading={save.isPending}
          onPress={() => {
            if (otherDebounceRef.current) clearTimeout(otherDebounceRef.current);
            persist(qualificationCodes, otherFormations);
          }}
        />
      ) : null}

      <View style={settings.section}>
        <View style={settings.sectionCard}>
          {NURSE_QUALIFICATIONS.map((item, index) => {
            const on =
              item.code === 'AUTRE' ? showOtherFields : qualificationCodes.includes(item.code);
            return (
              <Fragment key={item.code}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <ListRowShell
                  style={settings.row}
                  body={<AppText style={settings.label}>{item.label}</AppText>}
                  trailing={
                    <ToggleSwitch
                      value={on}
                      accessibilityLabel={item.label}
                      disabled={busy}
                      onValueChange={(v) => toggleQualification(item.code, v)}
                    />
                  }
                />
              </Fragment>
            );
          })}
        </View>
        <AppText variant="caption" style={styles.footer}>
          Affichés sur votre fiche publique. Enregistrement automatique.
        </AppText>
      </View>

      {showOtherFields ? (
        <ProfileSection title="Autres formations">
          {otherFormations.map((val, idx) => (
            <Row key={idx} gap={spacing[2]} align="center">
              <View style={styles.otherInput}>
                <Input
                  value={val}
                  onChangeText={(t) => {
                    const next = otherFormations.map((s, i) => (i === idx ? t : s));
                    setOtherFormations(next);
                    scheduleOtherSave(qualificationCodes, next);
                  }}
                  placeholder="Ex. Formation spécifique…"
                  accessibilityLabel={`Formation ${idx + 1}`}
                />
              </View>
              <IconActionButton
                label={`Supprimer la formation ${idx + 1}`}
                onPress={() => {
                  const next = otherFormations.filter((_, i) => i !== idx);
                  setOtherFormations(next.length ? next : ['']);
                  persist(qualificationCodes, next.length ? next : ['']);
                }}
              >
                <Trash2 size={iconSize.md} color={c.error} strokeWidth={ICON_STROKE_WIDTH} />
              </IconActionButton>
            </Row>
          ))}
          <Button
            title="Ajouter une formation"
            variant="ghost"
            size="md"
            leftIcon={<Plus size={iconSize.md} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} />}
            onPress={() => setOtherFormations([...otherFormations, ''])}
          />
        </ProfileSection>
      ) : null}
    </>
  );
}

function buildStyles(theme: Theme) {
  return {
    divider: {
      ...buildSettingsStyles(theme).divider,
      marginLeft: spacing[4],
    },
    footer: {
      paddingHorizontal: spacing[1],
    },
    otherInput: { minWidth: 0, flex: 1 },
  };
}

import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Cluster, Row } from '@/components/layout/primitives';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { SkeletonList } from '@/components/ui/skeletons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Plus, Trash2 } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
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
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  bare?: boolean;
}

export function ProfileNurseQualificationsSection({
  bare }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_profile_components_ProfileNurseQualificationsSection_tsx_styles');
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();
  const qc = useQueryClient();

  const [qualificationCodes, setQualificationCodes] = useState<string[]>([]);
  const [otherFormations, setOtherFormations] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const otherDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = useQuery({
    queryKey: queryKeys.profile.user(user?.id ?? ''),
    queryFn: async () => (await fetchUser(user!.id, 'full')).data,
    enabled: !!user?.id,
  });

  useEffect(() => {
    const d = q.data;
    if (!d) return;
    const { codes, otherFormations: others } = parseNurseQualificationsFromApi(
      (d as { nurse_qualifications?: unknown }).nurse_qualifications,
    );
    setQualificationCodes(codes);
    setOtherFormations(others.length ? others : codes.includes('AUTRE') ? [''] : []);
    setHydrated(true);
  }, [q.data]);

  const save = useMutation({
    mutationFn: (payload: { codes: string[]; others: string[] }) =>
      updateUser(user!.id, {
        nurse_qualifications: buildNurseQualificationsPayload(payload.codes, payload.others),
      }),
    onSuccess: async () => {
      await fetchMe();
      void qc.invalidateQueries({ queryKey: queryKeys.profile.user(user!.id) });
      toast('Diplôme mis à jour', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'nurse-qualifications'),
  });

  const persist = useCallback(
    (codes: string[], others: string[]) => {
      if (!hydrated || !user?.id) return;
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

  const body = q.isLoading ? (
    <SkeletonList count={4} itemHeight={52} gap={spacing[2]} />
  ) : (
    <>
      <AppText style={[styles.hint, bare && styles.hintBare]}>
        Activez les diplômes affichés sur votre fiche publique. Chaque changement est enregistré
        automatiquement.
      </AppText>
      <View style={[styles.list, bare && styles.listBare]}>
        {NURSE_QUALIFICATIONS.map((item) => {
          const on =
            item.code === 'AUTRE' ? showOtherFields : qualificationCodes.includes(item.code);
          return (
            <Cluster
              key={item.code}
              gap={spacing[3]}
              actions={
                <ToggleSwitch
                  value={on}
                  disabled={busy}
                  onValueChange={(v) => toggleQualification(item.code, v)}
                />
              }
              style={[styles.row, on && styles.rowEnabled, busy && styles.rowBusy]}
            >
              <AppText style={styles.rowTitle} numberOfLines={1}>
                {item.label}
              </AppText>
            </Cluster>
          );
        })}
      </View>
      {showOtherFields ? (
        <View style={[styles.otherBlock, bare && styles.otherBlockBare]}>
          <AppText style={styles.otherTitle}>Autres formations (précisez)</AppText>
          {otherFormations.map((val, idx) => (
            <Row key={idx} gap={spacing[2]} align="start" style={styles.otherRow}>
              <View style={styles.otherInput}>
                <Input
                  value={val}
                  onChangeText={(t) => {
                    const next = otherFormations.map((s, i) => (i === idx ? t : s));
                    setOtherFormations(next);
                    scheduleOtherSave(qualificationCodes, next);
                  }}
                  placeholder="Ex. Formation spécifique…"
                />
              </View>
              <Pressable
                onPress={() => {
                  const next = otherFormations.filter((_, i) => i !== idx);
                  setOtherFormations(next.length ? next : ['']);
                  persist(qualificationCodes, next.length ? next : ['']);
                }}
                hitSlop={8}
                style={styles.trashBtn}
              >
                <Trash2 size={iconSize.mdSm} color={c.error} strokeWidth={2} />
              </Pressable>
            </Row>
          ))}
          <Pressable
            onPress={() => {
              const next = [...otherFormations, ''];
              setOtherFormations(next);
            }}
          >
            <Row gap={spacing[2]} align="center" style={styles.addBtn}>
              <Plus size={iconSize.sm} color={c.primary} strokeWidth={2.5} />
              <AppText style={styles.addText}>Ajouter une formation</AppText>
            </Row>
          </Pressable>
        </View>
      ) : null}
    </>
  );

  if (bare) return body;

  return (
    <ProfileSection
      title="Diplômes et formations"
      description="Affichés sur votre fiche publique Cary"
      Icon={GraduationCap}
    >
      {body}
    </ProfileSection>
  );
}

function buildStyles(c: AppColors) {
  return {
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    lineHeight: fontSize.xs * 1.45,
  },
  hintBare: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
  list: { gap: spacing[2] },
  listBare: { paddingHorizontal: spacing[4] },
  row: {
    alignSelf: 'stretch' as const,
    width: '100%' as const,
    minHeight: 52,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.borderLight,
    backgroundColor: c.surfaceAlt,
  },
  rowEnabled: {
    borderColor: c.primaryMid,
    backgroundColor: c.primaryLight,
  },
  rowBusy: { opacity: 0.55 },
  rowTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  otherBlock: {
    gap: spacing[2],
    marginTop: spacing[2],
    padding: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  otherBlockBare: { marginHorizontal: spacing[4] },
  otherTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  otherRow: {},
  otherInput: { minWidth: 0, flex: 1 },
  trashBtn: { paddingTop: spacing[3] },
  addBtn: {
    paddingVertical: spacing[2],
  },
  addText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.primary,
  },
};
}


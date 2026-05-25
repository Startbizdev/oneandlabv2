import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  bare?: boolean;
}

export function ProfileNurseQualificationsSection({ bare }: Props) {
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
      <Text style={[styles.hint, bare && styles.hintBare]}>
        Activez les diplômes affichés sur votre fiche publique. Chaque changement est enregistré
        automatiquement.
      </Text>
      <View style={[styles.list, bare && styles.listBare]}>
        {NURSE_QUALIFICATIONS.map((item) => {
          const on =
            item.code === 'AUTRE' ? showOtherFields : qualificationCodes.includes(item.code);
          return (
            <View
              key={item.code}
              style={[styles.row, on && styles.rowEnabled, busy && styles.rowBusy]}
            >
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.label}
              </Text>
              <ToggleSwitch
                value={on}
                disabled={busy}
                onValueChange={(v) => toggleQualification(item.code, v)}
              />
            </View>
          );
        })}
      </View>
      {showOtherFields ? (
        <View style={[styles.otherBlock, bare && styles.otherBlockBare]}>
          <Text style={styles.otherTitle}>Autres formations (précisez)</Text>
          {otherFormations.map((val, idx) => (
            <View key={idx} style={styles.otherRow}>
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
                <Trash2 size={18} color={colors.error} strokeWidth={2} />
              </Pressable>
            </View>
          ))}
          <Pressable
            onPress={() => {
              const next = [...otherFormations, ''];
              setOtherFormations(next);
            }}
            style={styles.addBtn}
          >
            <Plus size={16} color={colors.primary} strokeWidth={2.5} />
            <Text style={styles.addText}>Ajouter une formation</Text>
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

const styles = StyleSheet.create({
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    lineHeight: fontSize.xs * 1.45,
  },
  hintBare: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
  list: { gap: spacing[2] },
  listBare: { paddingHorizontal: spacing[4] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    width: '100%',
    minHeight: 52,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceAlt,
  },
  rowEnabled: {
    borderColor: colors.primaryMid,
    backgroundColor: colors.primaryLight,
  },
  rowBusy: { opacity: 0.55 },
  rowTitle: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    marginRight: spacing[3],
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  otherBlock: {
    gap: spacing[2],
    marginTop: spacing[2],
    padding: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  otherBlockBare: { marginHorizontal: spacing[4] },
  otherTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  otherRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  otherInput: { flex: 1 },
  trashBtn: { paddingTop: spacing[3] },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  addText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
});

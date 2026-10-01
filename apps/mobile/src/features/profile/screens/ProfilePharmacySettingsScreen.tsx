import { useAppColors } from '@/theme/use-app-colors';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Store, Truck, PauseCircle } from 'lucide-react-native';
import { ProfileSubScreenLayout } from './ProfileSubScreenLayout';
import { fetchUser, updateUser } from '@/features/profile/api/profile.service';
import { ProfileLoadState } from '@/features/profile/components/ProfileLoadState';
import { useProfileDraft } from '@/features/profile/hooks/useProfileDraft';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { queryKeys } from '@/lib/query-keys';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { Row } from '@/components/layout/primitives';
import { Card } from '@/components/ui/Card';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

function boolField(v: unknown, fallback = true): boolean {
  if (v === false || v === 0 || v === '0') return false;
  if (v === true || v === 1 || v === '1') return true;
  return fallback;
}

const DEFAULT_DAYS = [1, 2, 3, 4, 5, 6];

const WEEK_DAYS = [
  { id: 1, label: 'L', name: 'Lundi' },
  { id: 2, label: 'M', name: 'Mardi' },
  { id: 3, label: 'M', name: 'Mercredi' },
  { id: 4, label: 'J', name: 'Jeudi' },
  { id: 5, label: 'V', name: 'Vendredi' },
  { id: 6, label: 'S', name: 'Samedi' },
  { id: 7, label: 'D', name: 'Dimanche' },
];

export function ProfilePharmacySettingsScreen() {
  const styles = useStyles(buildStyles);
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const qc = useQueryClient();
  const { show: toast } = useToast();

  const [clickCollect, setClickCollect] = useState(true);
  const [homeDelivery, setHomeDelivery] = useState(true);
  const [ordersPaused, setOrdersPaused] = useState(false);
  const [clickCollectDays, setClickCollectDays] = useState<number[]>(DEFAULT_DAYS);
  const [homeDeliveryDays, setHomeDeliveryDays] = useState<number[]>(DEFAULT_DAYS);

  const profileQ = useQuery({
    queryKey: queryKeys.profile.user(userId),
    queryFn: async () => (await fetchUser(userId)).data,
    enabled: !!userId,
  });

  const { dirty } = useProfileDraft(userId || undefined, profileQ.data,
    { clickCollect, homeDelivery, ordersPaused, clickCollectDays, homeDeliveryDays },
    (p) => ({
      clickCollect: boolField(p.pharmacy_accepts_click_collect),
      homeDelivery: boolField(p.pharmacy_accepts_home_delivery),
      ordersPaused: boolField(p.pharmacy_orders_paused, false),
      clickCollectDays: p.pharmacy_click_collect_days_json?.length ? p.pharmacy_click_collect_days_json : DEFAULT_DAYS,
      homeDeliveryDays: p.pharmacy_home_delivery_days_json?.length ? p.pharmacy_home_delivery_days_json : DEFAULT_DAYS,
    }),
    (d) => {
      setClickCollect(d.clickCollect);
      setHomeDelivery(d.homeDelivery);
      setOrdersPaused(d.ordersPaused);
      setClickCollectDays(d.clickCollectDays);
      setHomeDeliveryDays(d.homeDeliveryDays);
    },
  );

  const saveMut = useMutation({
    mutationFn: async () =>
      updateUser(userId, {
        pharmacy_accepts_click_collect: clickCollect,
        pharmacy_accepts_home_delivery: homeDelivery,
        pharmacy_orders_paused: ordersPaused,
        pharmacy_click_collect_days_json: clickCollectDays,
        pharmacy_home_delivery_days_json: homeDeliveryDays,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.profile.user(userId) });
      toast('Paramètres pharmacie enregistrés', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'pharmacy-profile-settings'),
  });

  // Tant que la configuration serveur n'est pas chargée, aucun formulaire (donc aucun envoi de valeurs par défaut).
  if (profileQ.isLoading || profileQ.isError || !profileQ.data) {
    return (
      <ProfileLoadState
        loading={profileQ.isLoading || !userId}
        refreshing={profileQ.isFetching}
        error={profileQ.error}
        onRetry={() => void profileQ.refetch()}
      />
    );
  }

  return (
    <ProfileSubScreenLayout onSave={() => saveMut.mutate()} saving={saveMut.isPending} dirty={dirty}>
      <AppText style={styles.intro}>
        Indiquez les modes de commande que votre officine accepte. Vous pouvez activer les deux ou un seul.
      </AppText>

      <SettingRow
        icon={Store}
        label="Click & collect"
        hint="Retrait en pharmacie"
        value={clickCollect}
        onChange={setClickCollect}
      />
      {clickCollect ? (
        <DaysPicker label="Jours de retrait" value={clickCollectDays} onChange={setClickCollectDays} />
      ) : null}
      <SettingRow
        icon={Truck}
        label="Livraison à domicile"
        hint="Livraison au patient"
        value={homeDelivery}
        onChange={setHomeDelivery}
      />
      {homeDelivery ? (
        <DaysPicker label="Jours de livraison" value={homeDeliveryDays} onChange={setHomeDeliveryDays} />
      ) : null}
      <SettingRow
        icon={PauseCircle}
        label="Pause commandes"
        hint="Masquer temporairement votre officine du catalogue"
        value={ordersPaused}
        onChange={setOrdersPaused}
      />

      {!clickCollect && !homeDelivery ? (
        <Card style={styles.warnCard}>
          <AppText style={styles.warnText}>
            Activez au moins un mode pour recevoir des commandes.
          </AppText>
        </Card>
      ) : null}
    </ProfileSubScreenLayout>
  );
}

function DaysPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number[];
  onChange: (days: number[]) => void;
}) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.daysBlock}>
      <AppText style={styles.daysLabel}>{label}</AppText>
      <Row gap={spacing[1.5]} justify="between">
        {WEEK_DAYS.map((day) => {
          const active = value.includes(day.id);
          return (
            <Pressable
              key={day.id}
              onPress={() =>
                onChange(
                  active
                    ? value.filter((id) => id !== day.id)
                    : [...value, day.id].sort((a, b) => a - b),
                )
              }
              hitSlop={4}
              accessibilityRole="checkbox"
              accessibilityLabel={day.name}
              accessibilityState={{ checked: active }}
              style={[styles.day, active && { backgroundColor: c.primary, borderColor: c.primary }]}
            >
              <AppText style={[styles.dayText, active && { color: c.onPrimary }]}>{day.label}</AppText>
            </Pressable>
          );
        })}
      </Row>
    </View>
  );
}

function SettingRow({
  icon: Icon,
  label,
  hint,
  value,
  onChange,
}: {
  icon: typeof Store;
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const c = useAppColors();
  const styles = useStyles(buildSettingStyles);

  return (
    <View style={styles.row}>
      <Row gap={spacing[3]} align="center" style={styles.rowInner}>
        <View style={styles.iconWrap}>
          <Icon size={iconSize.mdSm} color={c.primary} strokeWidth={2} />
        </View>
        <View style={styles.textCol}>
          <AppText style={styles.label}>{label}</AppText>
          <AppText style={styles.hint}>{hint}</AppText>
        </View>
        <ToggleSwitch value={value} onValueChange={onChange} accessibilityLabel={label} />
      </Row>
    </View>
  );
}

function buildStyles({ colors: c, fontSize, scale }: Theme) {
  return {
    intro: {
      ...font.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: scale(20),
    },
    daysBlock: {
      gap: spacing[2],
      padding: spacing[3],
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    daysLabel: {
      ...font.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    day: {
      width: 36,
      height: 36,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
    },
    dayText: {
      ...font.semiBold,
      fontSize: fontSize.xs,
      color: c.textSecondary,
    },
    warnCard: {
      backgroundColor: c.warningLight,
      borderColor: c.warning,
    },
    warnText: {
      ...font.medium,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
  };
}

function buildSettingStyles({ colors: c, fontSize }: Theme) {
  return {
    row: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      overflow: 'hidden' as const,
    },
    rowInner: {
      padding: spacing[4],
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: radius.sm,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.primaryLight,
    },
    textCol: { flex: 1, minWidth: 0 },
    label: {
      ...font.semiBold,
      fontSize: fontSize.md,
      color: c.textPrimary,
    },
    hint: {
      marginTop: 2,
      ...font.regular,
      fontSize: fontSize.xs,
      color: c.textSecondary,
    },
  };
}

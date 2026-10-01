import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Store, Truck, PauseCircle } from 'lucide-react-native';
import { ProfileSubScreenLayout } from './ProfileSubScreenLayout';
import { fetchUser, updateUser } from '@/features/profile/api/profile.service';
import { ProfileLoadState } from '@/features/profile/components/ProfileLoadState';
import { useProfileDraft } from '@/features/profile/hooks/useProfileDraft';
import { usePharmacyModuleEnabled } from '@/features/pharmacy-orders/hooks/use-pharmacy-module-enabled';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { queryKeys } from '@/lib/query-keys';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { Row } from '@/components/layout/primitives';
import { SettingsRow, buildSettingsStyles } from '@/components/ui/SettingsRow';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';

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
  const settings = useStyles(buildSettingsStyles);
  const styles = useStyles(buildStyles);
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const pharmacy = usePharmacyModuleEnabled();

  const [clickCollect, setClickCollect] = useState(true);
  const [homeDelivery, setHomeDelivery] = useState(true);
  const [ordersPaused, setOrdersPaused] = useState(false);
  const [clickCollectDays, setClickCollectDays] = useState<number[]>(DEFAULT_DAYS);
  const [homeDeliveryDays, setHomeDeliveryDays] = useState<number[]>(DEFAULT_DAYS);

  const profileQ = useQuery({
    queryKey: queryKeys.profile.user(userId),
    queryFn: async () => (await fetchUser(userId)).data,
    enabled: !!userId && pharmacy.isOwnPharmacy,
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
      toast('Réglages de l’officine enregistrés', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'pharmacy-profile-settings'),
  });

  if (pharmacy.loading || pharmacy.error) {
    return (
      <ProfileLoadState
        loading={pharmacy.loading || !userId}
        error={pharmacy.error}
        onRetry={() => void pharmacy.refetch()}
      />
    );
  }

  // Le serveur refuse ces réglages (403) hors compte officine : aucun formulaire, donc aucun envoi.
  if (!pharmacy.isOwnPharmacy) {
    return (
      <ProfileSubScreenLayout hideSave>
        <EmptyState
          illustration="pharmacy"
          title="Réservé aux officines"
          description="Ces réglages concernent les comptes pharmacie."
        />
      </ProfileSubScreenLayout>
    );
  }

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
      <View style={settings.section}>
        <AppText style={settings.sectionTitle}>Modes de commande</AppText>
        <View style={settings.sectionCard}>
          <SettingsRow
            icon={Store}
            label="Click & collect"
            description="Retrait en pharmacie"
            trailing={
              <ToggleSwitch value={clickCollect} onValueChange={setClickCollect} accessibilityLabel="Click & collect" />
            }
          />
          {clickCollect ? (
            <DaysPicker label="Jours de retrait" value={clickCollectDays} onChange={setClickCollectDays} />
          ) : null}
          <View style={settings.divider} />
          <SettingsRow
            icon={Truck}
            label="Livraison à domicile"
            description="Livraison au patient"
            trailing={
              <ToggleSwitch value={homeDelivery} onValueChange={setHomeDelivery} accessibilityLabel="Livraison à domicile" />
            }
          />
          {homeDelivery ? (
            <DaysPicker label="Jours de livraison" value={homeDeliveryDays} onChange={setHomeDeliveryDays} />
          ) : null}
        </View>
        {!clickCollect && !homeDelivery ? (
          <AppText style={styles.warn} accessibilityRole="alert">
            Activez au moins un mode pour recevoir des commandes.
          </AppText>
        ) : null}
      </View>

      <SettingsSection
        title="Disponibilité"
        items={[
          {
            icon: PauseCircle,
            label: 'Pause commandes',
            description: 'Masque temporairement votre officine du catalogue',
            trailing: (
              <ToggleSwitch value={ordersPaused} onValueChange={setOrdersPaused} accessibilityLabel="Pause commandes" />
            ),
          },
        ]}
      />
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
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.daysBlock}>
      <AppText variant="caption">{label}</AppText>
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
              style={[styles.day, active && styles.dayActive]}
            >
              <AppText style={[styles.dayText, active && styles.dayTextActive]}>{day.label}</AppText>
            </Pressable>
          );
        })}
      </Row>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    daysBlock: {
      gap: spacing[2],
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[4],
    },
    day: {
      width: 36,
      height: 36,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    dayActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    dayText: {
      ...font.semiBold,
      fontSize: fontSize.xs,
      color: c.textSecondary,
    },
    dayTextActive: {
      color: c.onPrimary,
    },
    warn: {
      ...font.medium,
      fontSize: fontSize.sm,
      color: c.warning,
      paddingHorizontal: spacing[1],
    },
  };
}

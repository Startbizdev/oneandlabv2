import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ageFromBirthDate } from '@oneandlab/shared-utils';
import {
  Calendar,
  ClipboardList,
  FolderOpen,
  Mail,
  MapPin,
  Phone,
  User,
} from 'lucide-react-native';
import { queryKeys } from '@/lib/query-keys';
import { SkeletonGroup } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { ProfileNavRow } from '@/features/profile/components/ProfileNavRow';
import { fetchPatientDocuments, fetchPatientHistory, fetchPatientProfile } from '../api/patient-profile.service';
import { useAuthStore } from '@/store/auth-store';
import { deletePatient } from '../api/patients.service';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { resolvePatientContactEmail } from '@/utils/patient-email-display';
import { ContactActionBar } from '@/features/appointments/detail/components/layout/ContactActionBar';
import {
  patientAddressLines,
  patientBirthLine,
  patientGenderLabel,
} from '../utils/patient-profile-display';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  rolePrefix?: '/(nurse)' | '/(pro)';
}

function InfoRow({
  icon: Icon,
  label,
  value,
  secondary,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  secondary?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Icon size={16} color={colors.primary} strokeWidth={2.25} />
      </View>
      <View style={styles.infoBody}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
        {secondary ? (
          <Text style={styles.infoSecondary} numberOfLines={2}>
            {secondary}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function PatientDetailScreen({ rolePrefix = '/(nurse)' }: Props) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { show: toast } = useToast();

  const profileQ = useQuery({
    queryKey: queryKeys.profile.user(id ?? ''),
    queryFn: async () => {
      const res = await fetchPatientProfile(id!);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Patient introuvable');
      return res.data;
    },
    enabled: !!id,
  });

  const historyQ = useQuery({
    queryKey: queryKeys.patients.history(id ?? ''),
    queryFn: async () => {
      const res = await fetchPatientHistory(id!);
      return res.data ?? [];
    },
    enabled: !!id,
  });

  const docsQ = useQuery({
    queryKey: queryKeys.documents.patient(id ?? ''),
    queryFn: async () => {
      const res = await fetchPatientDocuments(id!);
      return res.data ?? [];
    },
    enabled: !!id,
  });

  const p = profileQ.data;
  const canDelete = p?.created_by === user?.id;
  const name = `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() || 'Patient';
  const age = ageFromBirthDate(p?.birth_date);

  if (profileQ.isLoading || !p) {
    return (
      <>
        <Stack.Screen options={{ title: 'Patient' }} />
        <View style={styles.loading}>
          <SkeletonGroup count={3} height={56} gap={8} />
        </View>
      </>
    );
  }

  const email = resolvePatientContactEmail({
    rawEmail: p.email,
    emailDisplay: p.email_display,
    viewerEmail: user?.email,
    viewerEmailDisplay: (user as { email_display?: string | null })?.email_display,
  });

  const docCount = docsQ.data?.length ?? 0;
  const histCount = historyQ.data?.length ?? 0;
  const tel = p.phone?.replace(/\s/g, '') ?? '';
  const address = patientAddressLines(p.address);
  const birthLine = patientBirthLine(p.birth_date, age);
  const genderLine = patientGenderLabel(p.gender);

  const infoRows = [
    birthLine
      ? { icon: Calendar, label: 'Date de naissance', value: birthLine }
      : null,
    genderLine ? { icon: User, label: 'Genre', value: genderLine } : null,
    address
      ? {
          icon: MapPin,
          label: 'Adresse',
          value: address.main,
          secondary: address.complement,
        }
      : null,
    p.phone ? { icon: Phone, label: 'Téléphone', value: p.phone } : null,
    email.text ? { icon: Mail, label: 'E-mail', value: email.text } : null,
  ].filter(Boolean) as {
    icon: LucideIcon;
    label: string;
    value: string;
    secondary?: string;
  }[];

  const contactActions = [
    tel
      ? {
          key: 'phone',
          label: 'Appeler',
          icon: 'phone' as const,
          onPress: () => void Linking.openURL(`tel:${tel}`),
        }
      : null,
    tel
      ? {
          key: 'sms',
          label: 'Message',
          icon: 'message' as const,
          onPress: () => void Linking.openURL(`sms:${tel}`),
        }
      : null,
    email.href
      ? {
          key: 'email',
          label: 'E-mail',
          icon: 'email' as const,
          onPress: () => void Linking.openURL(email.href!),
        }
      : null,
  ].filter(Boolean) as Parameters<typeof ContactActionBar>[0]['actions'];

  const docsSubtitle =
    docCount === 0
      ? 'Vitale, mutuelle… · ouvrir le dossier'
      : docCount === 1
        ? '1 document enregistré'
        : `${docCount} documents enregistrés`;

  const histSubtitle =
    histCount === 0
      ? 'Aucun rendez-vous passé'
      : histCount === 1
        ? '1 rendez-vous passé'
        : `${histCount} rendez-vous passés`;

  return (
    <>
      <Stack.Screen options={{ title: name, headerLargeTitle: false }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={profileQ.isRefetching}
            onRefresh={() => {
              void profileQ.refetch();
              void historyQ.refetch();
              void docsQ.refetch();
            }}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.hero}>
          <ProfileAvatar
            profileImageUrl={(p as { profile_image_url?: string | null }).profile_image_url}
            seed={p.id ?? name}
            gender={p.gender}
            size={56}
            style={styles.avatar}
          />
          <View style={styles.heroText}>
            <Text style={styles.heroName}>{name}</Text>
            {age != null ? <Text style={styles.heroMeta}>{age} ans</Text> : null}
          </View>
        </View>

        {infoRows.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardKicker}>Fiche patient</Text>
            {infoRows.map((row, index) => (
              <View key={row.label}>
                {index > 0 ? <View style={styles.rowDivider} /> : null}
                <InfoRow
                  icon={row.icon}
                  label={row.label}
                  value={row.value}
                  secondary={row.secondary}
                />
              </View>
            ))}
          </View>
        ) : null}

        {contactActions.length > 0 ? (
          <ContactActionBar actions={contactActions} />
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardKicker}>Dossier</Text>
          <ProfileNavRow
            icon={FolderOpen}
            title="Documents"
            subtitle={docsSubtitle}
            onPress={() => router.push(`${rolePrefix}/patient/${id}/documents` as never)}
          />
          <View style={styles.rowDividerInset} />
          <ProfileNavRow
            icon={ClipboardList}
            title="Historique"
            subtitle={histSubtitle}
            badge={histCount}
            onPress={() => router.push(`${rolePrefix}/patient/${id}/history` as never)}
            iconColor="#0D9488"
            iconBg="#F0FDFA"
          />
        </View>

        <Button
          title="Créer un rendez-vous"
          fullWidth
          onPress={() => router.push(`${rolePrefix}/appointments/new?patient_id=${id}` as never)}
        />

        {canDelete ? (
          <Button
            title="Supprimer le patient"
            variant="destructive"
            fullWidth
            onPress={async () => {
              try {
                const res = await deletePatient(id!);
                if (!res.success) throw new Error(res.error);
                toast('Patient supprimé', { type: 'success' });
                router.back();
              } catch (e) {
                handleApiError(e, toast, 'deletePatient');
              }
            }}
          />
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[8],
    gap: spacing[4],
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  heroName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  heroMeta: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  card: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  cardKicker: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3.5],
    paddingBottom: spacing[2],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  infoBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  infoLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: fontSize.sm * 1.4,
  },
  infoSecondary: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.4,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
    marginLeft: spacing[4] + 36 + spacing[3],
  },
  rowDividerInset: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
    marginLeft: spacing[4] + 40 + spacing[3],
  },
});

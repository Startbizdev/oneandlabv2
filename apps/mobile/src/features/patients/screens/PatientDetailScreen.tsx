import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Cluster, Row } from '@/components/layout/primitives';
import type { LucideIcon } from 'lucide-react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ageFromBirthDate } from '@oneandlab/shared-utils';
import {
  Calendar,
  ClipboardList,
  CreditCard,
  FilePenLine,
  FolderOpen,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  User,
} from 'lucide-react-native';
import { queryKeys } from '@/lib/query-keys';
import { Skeleton, SkeletonList, SkeletonProfileScreen } from '@/components/ui/skeletons';
import { Button } from '@/components/ui/Button';
import { ProfileNavRow } from '@/features/profile/components/ProfileNavRow';
import { fetchPatientDocuments, fetchPatientProfile, fetchStaffPatientHistoryAppointments, filterCoverageProfileDocuments } from '../api/patient-profile.service';
import { useAuthStore } from '@/store/auth-store';
import { deletePatient } from '../api/patients.service';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { resolvePatientContactEmail } from '@/utils/patient-email-display';
import type { PatientContactButton } from '@/utils/contact-actions';
import {
  patientAddressLines,
  patientBirthLine,
  patientGenderLabel,
} from '../utils/patient-profile-display';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import {
  buildTabSceneScrollConfig,
  spreadTabSceneScrollProps,
  useTabSceneInsets,
} from '@/components/navigation/liquid-glass-header-inset';

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
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PatientDetailScreen.InfoRow');
  return (
    <View style={styles.infoRow}>
      <Cluster gap={spacing[3]} align="start" leading={
        <View style={styles.infoIconWrap}>
          <Icon size={16} color={c.primary} strokeWidth={2.25} />
        </View>
      }>
        <View style={styles.infoBody}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value}</Text>
          {secondary ? (
            <Text style={styles.infoSecondary} numberOfLines={2}>
              {secondary}
            </Text>
          ) : null}
        </View>
      </Cluster>
    </View>
  );
}

export function PatientDetailScreen({ rolePrefix = '/(nurse)' }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_patients_screens_PatientDetailScreen_tsx_styles');

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { show: toast } = useToast();
  const sceneInsets = useTabSceneInsets();
  const scrollConfig = buildTabSceneScrollConfig(sceneInsets, styles.content);

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
    queryKey: queryKeys.patients.historyCount(id ?? ''),
    queryFn: async () => {
      const { total } = await fetchStaffPatientHistoryAppointments(id!);
      return total;
    },
    enabled: !!id,
  });

  const docsQ = useQuery({
    queryKey: queryKeys.documents.patient(id ?? ''),
    queryFn: async () => {
      const res = await fetchPatientDocuments(id!);
      if (!res.success) throw new Error(res.error ?? 'Impossible de charger les documents');
      return filterCoverageProfileDocuments(res.data);
    },
    enabled: !!id,
  });

  const p = profileQ.data;
  const canDelete = p?.created_by === user?.id;
  const name = `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() || 'Patient';
  const age = ageFromBirthDate(p?.birth_date);

  if (profileQ.isLoading || !p) {
    return (
      <StackChromeScreen>
        <Stack.Screen options={{ title: 'Patient' }} />
        <SkeletonProfileScreen cards={2} />
      </StackChromeScreen>
    );
  }

  const email = resolvePatientContactEmail({
    rawEmail: p.email,
    emailDisplay: p.email_display,
    viewerEmail: user?.email,
    viewerEmailDisplay: (user as { email_display?: string | null })?.email_display,
  });

  const docCount = docsQ.data?.length ?? 0;
  const histCount = historyQ.data ?? 0;
  const tel = p.phone?.replace(/\s/g, '') ?? '';
  const address = patientAddressLines(p.address);
  const birthLine = patientBirthLine(p.birth_date, age);
  const genderLine = patientGenderLabel(p.gender);

  const infoRows = [
    birthLine
      ? { icon: Calendar, label: 'Date de naissance', value: birthLine }
      : null,
    genderLine ? { icon: User, label: 'Genre', value: genderLine } : null,
    p.nir?.trim()
      ? { icon: CreditCard, label: 'N° sécurité sociale', value: p.nir.trim() }
      : null,
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

  const contactButtons: PatientContactButton[] = [
    tel
      ? {
          key: 'phone',
          label: 'Appeler',
          icon: 'phone',
          color: c.success,
          onPress: () => void Linking.openURL(`tel:${tel}`),
        }
      : null,
    tel
      ? {
          key: 'sms',
          label: 'Message',
          icon: 'message',
          color: c.primary,
          onPress: () => void Linking.openURL(`sms:${tel}`),
        }
      : null,
    email.href
      ? {
          key: 'email',
          label: 'E-mail',
          icon: 'email',
          color: c.gradientEnd,
          onPress: () => void Linking.openURL(email.href!),
        }
      : null,
  ].filter(Boolean) as PatientContactButton[];

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
    <StackChromeScreen>
      <Stack.Screen options={{ title: name, headerLargeTitle: false }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={scrollConfig.contentContainerStyle}
        {...spreadTabSceneScrollProps(scrollConfig)}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={profileQ.isRefetching}
            onRefresh={() => {
              void profileQ.refetch();
              void historyQ.refetch();
              void docsQ.refetch();
            }}
            tintColor={c.primary}
            progressViewOffset={scrollConfig.refreshProgressOffset}
          />
        }
      >
        <Cluster
          gap={spacing[3]}
          leading={
            <ProfileAvatar
              profileImageUrl={p.profile_image_url}
              seed={p.id ?? name}
              gender={p.gender}
              size={56}
              style={styles.avatar}
            />
          }
        >
          <View style={styles.heroText}>
            <Text style={styles.heroName}>{name}</Text>
            {age != null ? <Text style={styles.heroMeta}>{age} ans</Text> : null}
          </View>
        </Cluster>

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

        {contactButtons.length > 0 ? (
          <Row gap={spacing[1.5]}>
            {contactButtons.map((btn) => {
              const Icon =
                btn.icon === 'phone' ? Phone : btn.icon === 'message' ? MessageCircle : Mail;
              return (
                <View key={btn.key} style={styles.buttonCell}>
                  <Button
                    title={btn.label}
                    size="sm"
                    variant="primary"
                    leftIcon={<Icon size={14} color={c.textInverse} strokeWidth={2.5} />}
                    onPress={btn.onPress}
                    style={{ backgroundColor: btn.color, width: '100%' as const }}
                  />
                </View>
              );
            })}
          </Row>
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
          {(user?.role === 'pro' || user?.role === 'nurse') ? (
            <>
              <ProfileNavRow
                icon={FilePenLine}
                title="Ordonnances"
                subtitle="Historique et création"
                onPress={() => router.push(`${rolePrefix}/patient/${id}/prescriptions` as never)}
              />
              <View style={styles.rowDividerInset} />
            </>
          ) : null}
          <ProfileNavRow
            icon={ClipboardList}
            title="Historique"
            subtitle={histSubtitle}
            badge={histCount}
            onPress={() => router.push(`${rolePrefix}/patient/${id}/history` as never)}
            iconColor={c.success}
            iconBg={c.successLight}
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
    </StackChromeScreen>
  );
}

function buildStyles(c: AppColors) {
  return {
  screen: {
    minWidth: 0,
    flex: 1,
    backgroundColor: c.background,
  },
  loading: {
    minWidth: 0,
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
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: c.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
    color: c.textPrimary,
    letterSpacing: -0.3,
  },
  heroMeta: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  card: {
    width: '100%' as const,
    alignSelf: 'stretch' as const,
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    overflow: 'hidden' as const,
  },
  cardKicker: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3.5],
    paddingBottom: spacing[2],
  },
  infoRow: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: c.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
    fontSize: fontSize.xs,
    color: c.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  infoValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    lineHeight: fontSize.sm * 1.4,
  },
  infoSecondary: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    lineHeight: fontSize.xs * 1.4,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.borderLight,
    marginLeft: spacing[4] + 36 + spacing[3],
  },
  rowDividerInset: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.borderLight,
    marginLeft: spacing[4] + 40 + spacing[3],
  },
  buttonCell: {
    flex: 1,
    minWidth: 0,
  },
};
}


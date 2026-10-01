import { useAppColors } from '@/theme/use-app-colors';
import { Fragment, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { useScrollToTopOnPop } from '@/lib/hooks/use-scroll-to-top-on-pop';
import { Cluster, Row } from '@/components/layout/primitives';
import type { LucideIcon } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ageFromBirthDate } from '@oneandlab/shared-utils';
import {
  ClipboardList,
  FilePenLine,
  FolderOpen,
  HeartPulse,
  Mail,
  MessageCircle,
  Phone,
  Pill,
  Trash2,
} from 'lucide-react-native';
import { queryKeys } from '@/lib/query-keys';
import { SkeletonProfileScreen } from '@/components/ui/skeletons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { buildSettingsStyles, type SettingsRowProps } from '@/components/ui/SettingsRow';
import { HeaderAction } from '@/components/navigation/HeaderAction';
import {
  fetchPatientDocuments,
  fetchStaffPatientHistoryAppointments,
  filterCoverageProfileDocuments,
} from '../api/patient-profile.service';
import { useStaffPatientProfile } from '../hooks/use-staff-patient-profile';
import { useAuthStore } from '@/store/auth-store';
import { deletePatient } from '../api/patients.service';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { resolvePatientContactEmail } from '@/utils/patient-email-display';
import { DeletePatientConfirmSheet } from '../components/DeletePatientConfirmSheet';
import { patientAddressLines, patientBirthLine, patientGenderLabel } from '../utils/patient-profile-display';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { usePharmacyModuleEnabled } from '@/features/pharmacy-orders/hooks/use-pharmacy-module-enabled';
import { ICON_STROKE_WIDTH, spacing, iconSize, avatarSize, AppText, useStyles, type Theme } from '@/theme';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { bookingNewHref, pharmacyOrderNewHref, staffPatientHref } from '@/navigation/role-hrefs';
import type { StaffRoutePrefix } from '@/navigation/role-route-prefix';
import { StaffPatientEditSheet } from '../components/StaffPatientEditSheet';

interface Props {
  rolePrefix?: StaffRoutePrefix;
}

type ContactAction = {
  key: string;
  label: string;
  icon: LucideIcon;
  url: string;
};

type InfoLine = { label: string; value: string; secondary?: string };

/** Fiche patient vue par l'infirmier ou le pro : identité, contact, dossier, création de RDV. */
export function PatientDetailScreen({ rolePrefix = '/(nurse)' }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const sectionStyles = useStyles(buildSettingsStyles);

  const { id } = useLocalSearchParams<{ id: string }>();
  const patientId = id ?? '';
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { show: toast } = useToast();
  const { canOrder } = usePharmacyModuleEnabled();

  const profileQ = useStaffPatientProfile(patientId);

  const historyQ = useQuery({
    queryKey: queryKeys.patients.historyCount(patientId),
    queryFn: async () => {
      const { total } = await fetchStaffPatientHistoryAppointments(patientId);
      return total;
    },
    enabled: !!patientId,
  });

  const docsQ = useQuery({
    queryKey: queryKeys.documents.patient(patientId),
    queryFn: async () => {
      const res = await fetchPatientDocuments(patientId);
      if (!res.success) throw new Error(res.error ?? 'Impossible de charger les documents');
      return filterCoverageProfileDocuments(res.data);
    },
    enabled: !!patientId,
  });

  const pullRefresh = useManualRefresh(async () => {
    await Promise.all([profileQ.refetch(), historyQ.refetch(), docsQ.refetch()]);
  });
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTopOnPop(scrollRef);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const deleteMut = useMutation({
    mutationFn: async () => {
      const res = await deletePatient(patientId);
      if (!res.success) throw new Error(res.error ?? 'Suppression impossible');
    },
    onSuccess: () => {
      setDeleteOpen(false);
      toast('Patient supprimé', { type: 'success' });
      router.back();
    },
    onError: (e) => {
      setDeleteOpen(false);
      handleApiError(e, toast, 'deletePatient');
    },
  });

  const p = profileQ.data;

  if (!p) {
    return (
      <StackChromeScreen>
        {profileQ.isError ? (
          <View style={styles.errorWrap}>
            <ErrorState
              title="Fiche patient indisponible"
              error={profileQ.error}
              onRetry={() => void profileQ.refetch()}
            />
          </View>
        ) : (
          <SkeletonProfileScreen cards={2} />
        )}
      </StackChromeScreen>
    );
  }

  const canDelete = p.created_by != null && p.created_by === user?.id;
  const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Patient';
  const age = ageFromBirthDate(p.birth_date);

  const openContact = (url: string) => {
    Linking.openURL(url).catch((error: unknown) => {
      if (__DEV__) console.warn('[patient-detail] ouverture contact impossible', error);
      toast('Action indisponible sur cet appareil', { type: 'error' });
    });
  };

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
  const nir = p.nir?.trim();

  const infoLines: InfoLine[] = [];
  if (birthLine) infoLines.push({ label: 'Date de naissance', value: birthLine });
  if (genderLine) infoLines.push({ label: 'Genre', value: genderLine });
  if (nir) infoLines.push({ label: 'N° de sécurité sociale', value: nir });
  if (address) {
    infoLines.push({
      label: 'Adresse',
      value: address.main,
      ...(address.complement ? { secondary: address.complement } : {}),
    });
  }
  if (p.phone) infoLines.push({ label: 'Téléphone', value: p.phone });
  if (email.text) infoLines.push({ label: 'E-mail', value: email.text });

  const contactActions: ContactAction[] = [];
  if (tel) {
    contactActions.push(
      { key: 'phone', label: 'Appeler', icon: Phone, url: `tel:${tel}` },
      { key: 'sms', label: 'SMS', icon: MessageCircle, url: `sms:${tel}` },
    );
  }
  if (email.href) {
    contactActions.push({ key: 'email', label: 'E-mail', icon: Mail, url: email.href });
  }

  const dossierItems: SettingsRowProps[] = [
    {
      icon: FolderOpen,
      label: 'Documents',
      ...(docCount > 0 ? { value: String(docCount) } : {}),
      onPress: () => router.push(staffPatientHref(rolePrefix, patientId, 'documents')),
    },
  ];
  if (user?.role === 'pro' || user?.role === 'nurse') {
    dossierItems.push({
      icon: FilePenLine,
      label: 'Ordonnances',
      onPress: () => router.push(staffPatientHref(rolePrefix, patientId, 'prescriptions')),
    });
  }
  dossierItems.push(
    {
      icon: ClipboardList,
      label: 'Historique',
      ...(histCount > 0 ? { value: String(histCount) } : {}),
      onPress: () => router.push(staffPatientHref(rolePrefix, patientId, 'history')),
    },
    {
      icon: HeartPulse,
      label: 'Carnet de santé',
      onPress: () => router.push(staffPatientHref(rolePrefix, patientId, 'health-record')),
    },
  );
  if (canOrder) {
    dossierItems.push({
      icon: Pill,
      label: 'Commander en pharmacie',
      onPress: () => router.push(pharmacyOrderNewHref(rolePrefix, patientId)),
    });
  }

  return (
    <StackChromeScreen
      headerRight={
        <HeaderAction label="Modifier" accessibilityLabel="Modifier la fiche patient" onPress={() => setEditOpen(true)} />
      }
    >
      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<AppRefreshControl refreshing={pullRefresh.refreshing} onRefresh={pullRefresh.onRefresh} />}
      >
        <Cluster
          gap={spacing[3]}
          leading={
            <ProfileAvatar profileImageUrl={p.profile_image_url} seed={p.id ?? name} gender={p.gender} size={avatarSize.md} />
          }
        >
          <View style={styles.heroText}>
            <AppText variant="title" accessibilityRole="header">
              {name}
            </AppText>
            {age != null ? <AppText variant="secondary">{age} ans</AppText> : null}
          </View>
        </Cluster>

        <View style={styles.actions}>
          <Button
            title="Créer un rendez-vous"
            fullWidth
            onPress={() => router.push(bookingNewHref(rolePrefix, { patient_id: patientId }))}
          />
          {contactActions.length > 0 ? (
            <Row gap={spacing[2]} wrap>
              {contactActions.map(({ key, label, icon: Icon, url }) => (
                <View key={key} style={styles.buttonCell}>
                  <Button
                    title={label}
                    size="sm"
                    variant="secondary"
                    leftIcon={<Icon size={iconSize.sm} color={c.textPrimary} strokeWidth={ICON_STROKE_WIDTH} />}
                    onPress={() => openContact(url)}
                  />
                </View>
              ))}
            </Row>
          ) : null}
        </View>

        {infoLines.length > 0 ? (
          <View style={sectionStyles.section}>
            <AppText style={sectionStyles.sectionTitle} accessibilityRole="header">
              Informations
            </AppText>
            <Card padding="none">
              {infoLines.map((line, index) => (
                <Fragment key={line.label}>
                  {index > 0 ? <View style={styles.rowDivider} /> : null}
                  <View style={styles.infoRow}>
                    <AppText variant="caption">{line.label}</AppText>
                    <AppText variant="body">{line.value}</AppText>
                    {line.secondary ? <AppText variant="secondary">{line.secondary}</AppText> : null}
                  </View>
                </Fragment>
              ))}
            </Card>
          </View>
        ) : null}

        <SettingsSection title="Dossier" items={dossierItems} />

        {canDelete ? (
          <SettingsSection
            items={[
              {
                icon: Trash2,
                label: 'Supprimer le patient',
                destructive: true,
                inlineAction: true,
                onPress: () => setDeleteOpen(true),
              },
            ]}
          />
        ) : null}
      </ScrollView>

      <DeletePatientConfirmSheet
        patientName={deleteOpen ? name : null}
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
        onClose={() => setDeleteOpen(false)}
      />

      <StaffPatientEditSheet
        visible={editOpen}
        patientId={patientId}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          void profileQ.refetch();
        }}
      />
    </StackChromeScreen>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    screen: {
      minWidth: 0,
      flex: 1,
      backgroundColor: c.background,
    },
    errorWrap: {
      minWidth: 0,
      flex: 1,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing[4],
    },
    content: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[2],
      paddingBottom: spacing[8],
      gap: spacing[6],
    },
    heroText: {
      flex: 1,
      minWidth: 0,
      gap: spacing[0.5],
    },
    actions: {
      gap: spacing[3],
    },
    infoRow: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      gap: spacing[0.5],
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.borderLight,
      marginLeft: spacing[4],
    },
    buttonCell: {
      flexGrow: 1,
    },
  };
}

import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Phone, MessageSquare } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { useAuthStore } from '@/store/auth-store';
import { Card } from '@/components/ui/Card';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type AptExt = Appointment & Record<string, unknown>;

function ContactActions({ phone }: { phone?: string }) {
  if (!phone?.trim()) return null;
  const tel = phone.trim();
  return (
    <View style={styles.actions}>
      <Pressable onPress={() => void Linking.openURL(`tel:${tel}`)} style={styles.chip}>
        <Phone size={14} color={colors.primary} strokeWidth={2} />
        <Text style={styles.chipText}>Appeler</Text>
      </Pressable>
      <Pressable onPress={() => void Linking.openURL(`sms:${tel}`)} style={styles.chip}>
        <MessageSquare size={14} color={colors.primary} strokeWidth={2} />
        <Text style={styles.chipText}>Message</Text>
      </Pressable>
    </View>
  );
}

function AssigneeRow({
  label,
  name,
  phone,
  bordered,
}: {
  label: string;
  name: string;
  phone?: string;
  bordered: boolean;
}) {
  if (!name.trim()) return null;
  return (
    <View style={[styles.block, bordered && styles.blockBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.name}>{name}</Text>
      <ContactActions phone={phone} />
    </View>
  );
}

export function hasAssigneeContent(apt: Appointment, role: string): boolean {
  const user = useAuthStore.getState().user;
  const ext = apt as AptExt;
  const isPatient = role === 'patient';

  const hideNurse =
    user?.role === 'nurse' && String(ext.assigned_nurse_id ?? '') === String(user.id ?? '');
  const hideLab =
    (user?.role === 'lab' || user?.role === 'subaccount') &&
    String(ext.assigned_lab_id ?? '') === String(user?.id ?? '');
  const hidePreleveur =
    user?.role === 'preleveur' && String(ext.assigned_to ?? '') === String(user.id ?? '');

  const nurseName = String(ext.assigned_nurse_display_name ?? '').trim();
  const labName = String(ext.assigned_lab_display_name ?? '').trim();
  const preleveurName = String(ext.assigned_to_display_name ?? '').trim();
  const creatorName = String(
    ext.creator_display_name ?? ext.created_by_display_name ?? ext.creator_name ?? '',
  ).trim();
  const platformOrigin = String(ext.patient_platform_origin_display ?? '').trim();

  const showNurse =
    isNursingAppointment(apt.type) && !hideNurse && (nurseName || ext.assigned_nurse_id);
  const showLab =
    isBloodTestAppointment(apt.type) && !hideLab && (labName || ext.assigned_lab_id);
  const showPreleveur =
    isBloodTestAppointment(apt.type) &&
    !hidePreleveur &&
    (preleveurName || ext.assigned_to);
  const showCreator = !isPatient && creatorName && role !== 'patient';
  const showPlatform = isPatient && platformOrigin;

  return Boolean(showNurse || showLab || showPreleveur || showCreator || showPlatform);
}

export function RdvAssigneeSection({ apt, role }: { apt: Appointment; role: string }) {
  const user = useAuthStore((s) => s.user);
  const ext = apt as AptExt;
  const isPatient = role === 'patient';

  const hideNurse =
    user?.role === 'nurse' && String(ext.assigned_nurse_id ?? '') === String(user.id ?? '');
  const hideLab =
    (user?.role === 'lab' || user?.role === 'subaccount') &&
    String(ext.assigned_lab_id ?? '') === String(user?.id ?? '');
  const hidePreleveur =
    user?.role === 'preleveur' && String(ext.assigned_to ?? '') === String(user.id ?? '');

  const nurseName = String(ext.assigned_nurse_display_name ?? '').trim();
  const labName = String(ext.assigned_lab_display_name ?? '').trim();
  const preleveurName = String(ext.assigned_to_display_name ?? '').trim();
  const creatorName = String(
    ext.creator_display_name ?? ext.created_by_display_name ?? ext.creator_name ?? '',
  ).trim();
  const creatorRole = String(ext.creator_role ?? ext.created_by_role ?? '').trim();
  const platformOrigin = String(ext.patient_platform_origin_display ?? '').trim();

  const showNurse =
    isNursingAppointment(apt.type) && !hideNurse && (nurseName || ext.assigned_nurse_id);
  const showLab =
    isBloodTestAppointment(apt.type) && !hideLab && (labName || ext.assigned_lab_id);
  const showPreleveur =
    isBloodTestAppointment(apt.type) &&
    !hidePreleveur &&
    (preleveurName || ext.assigned_to);
  const showCreator = !isPatient && creatorName && role !== 'patient';
  const showPlatform = isPatient && platformOrigin;

  if (!showNurse && !showLab && !showPreleveur && !showCreator && !showPlatform) {
    return null;
  }

  let bordered = false;
  const withBorder = () => {
    const b = bordered;
    bordered = true;
    return b;
  };

  return (
    <Card shadow="sm" padding="none">
      {showNurse ? (
        <AssigneeRow
          label="Infirmier(e)"
          name={nurseName || 'Assigné'}
          phone={String(ext.assigned_nurse_phone ?? '')}
          bordered={withBorder()}
        />
      ) : null}
      {showLab ? (
        <AssigneeRow
          label="Laboratoire"
          name={labName || 'Assigné'}
          phone={String(ext.assigned_lab_phone ?? '')}
          bordered={withBorder()}
        />
      ) : null}
      {showPreleveur ? (
        <AssigneeRow
          label="Préleveur"
          name={preleveurName || 'Assigné'}
          phone={String(ext.assigned_preleveur_phone ?? ext.assigned_to_phone ?? '')}
          bordered={withBorder()}
        />
      ) : null}
      {showCreator ? (
        <View style={[styles.block, withBorder() && styles.blockBorder]}>
          <Text style={styles.rowLabel}>Créé par</Text>
          <Text style={styles.name}>{creatorName}</Text>
          {creatorRole ? <Text style={styles.sub}>{creatorRole}</Text> : null}
        </View>
      ) : null}
      {showPlatform ? (
        <View style={[styles.block, withBorder() && styles.blockBorder]}>
          <Text style={styles.rowLabel}>Origine</Text>
          <Text style={styles.name}>{platformOrigin}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  block: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[1],
  },
  blockBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  rowLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  name: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  sub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
  },
});

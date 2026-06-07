import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CalendarX2 } from 'lucide-react-native';
import {
  cancellationReasonRequiresPhoto,
  staffCancellationCanSubmit,
} from '@oneandlab/shared-constants';
import type { Appointment } from '@oneandlab/shared-types';
import { SheetModal } from '@/components/ui/SheetModal';
import { Button } from '@/components/ui/Button';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { patientDisplayName } from '@/utils/appointment-detail-display';
import {
  cancelAppointment,
  cancelAppointmentsPatientBatch,
} from '../../api/appointment-detail.service';
import {
  StaffCancellationFields,
  type StaffCancellationValues,
} from './StaffCancellationFields';
import {
  carePhotoPickErrorMessage,
  pickCarePhoto,
} from '@/lib/uploads/pick-care-photo';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  visible: boolean;
  role: string;
  /** RDV à annuler (lot patient = plusieurs). */
  targets: Appointment[];
  onDone: () => void;
  onClose: () => void;
}

const EMPTY_STAFF: StaffCancellationValues = { reason: '', comment: '' };

function cancelSheetSubtitle(isPatient: boolean, isBatch: boolean, count: number): string {
  if (isBatch) {
    return `${count} rendez-vous seront définitivement annulés.`;
  }
  if (isPatient) {
    return 'Cette action est définitive et ne peut pas être annulée.';
  }
  return 'Indiquez la raison avant de confirmer l’annulation.';
}

export function CancelAppointmentSheet({ visible, role, targets, onDone, onClose }: Props) {
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [staff, setStaff] = useState<StaffCancellationValues>(EMPTY_STAFF);
  const [sheetVisible, setSheetVisible] = useState(false);
  const pickingPhotoRef = useRef(false);
  const isPatient = role === 'patient';
  const isBatch = targets.length > 1;
  const canSubmitStaff = staffCancellationCanSubmit(staff.reason, staff.comment);

  const presentKey = useMemo(
    () => targets.map((t) => t.id).join(',') || 'cancel',
    [targets],
  );

  const primaryTarget = targets[0];
  const targetLabel = primaryTarget ? patientDisplayName(primaryTarget) : null;

  useEffect(() => {
    if (visible) {
      setSheetVisible(true);
    } else {
      setSheetVisible(false);
      pickingPhotoRef.current = false;
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setStaff(EMPTY_STAFF);
    }
  }, [visible]);

  function patchStaff(patch: Partial<StaffCancellationValues>) {
    setStaff((prev) => {
      const next = { ...prev, ...patch };
      if (patch.reason != null && !cancellationReasonRequiresPhoto(patch.reason)) {
        next.photoUri = undefined;
        next.photoName = undefined;
        next.photoMimeType = undefined;
      }
      return next;
    });
  }

  const handleSheetDismissed = useCallback(() => {
    if (!pickingPhotoRef.current) return;
    pickingPhotoRef.current = false;

    void (async () => {
      try {
        const picked = await pickCarePhoto();
        if (picked) {
          patchStaff({
            photoUri: picked.uri,
            photoName: picked.fileName,
            photoMimeType: picked.mimeType,
          });
        }
      } catch (e) {
        toast(carePhotoPickErrorMessage(e), { type: 'warning' });
      } finally {
        if (visible) setSheetVisible(true);
      }
    })();
  }, [toast, visible]);

  const beginPhotoPick = useCallback(() => {
    pickingPhotoRef.current = true;
    setSheetVisible(false);
  }, []);

  const mut = useMutation({
    mutationFn: async () => {
      if (isPatient) {
        return cancelAppointmentsPatientBatch(targets.map((t) => t.id));
      }
      const first = targets[0];
      if (!first) throw new Error('NO_TARGET');
      return cancelAppointment(first.id, {
        reason: staff.reason,
        comment: staff.comment.trim(),
        photoUri: staff.photoUri,
        photoName: staff.photoName,
        photoMimeType: staff.photoMimeType,
      }).then((r) => ({
        ok: r.ok,
        canceled: r.ok ? 1 : 0,
        error: r.error,
      }));
    },
    onSuccess: (r) => {
      if (!r.ok) {
        toast(r.error ?? 'Annulation impossible', { type: 'error' });
        return;
      }
      void qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
      const n = r.canceled;
      toast(n > 1 ? `${n} rendez-vous annulés` : 'Rendez-vous annulé', { type: 'success' });
      onDone();
    },
    onError: (e) => handleApiError(e, toast, 'cancelAppointment'),
  });

  const title = isBatch ? 'Annuler le lot' : 'Annuler le rendez-vous';
  const subtitle = cancelSheetSubtitle(isPatient, isBatch, targets.length);

  const footer = (
    <View style={styles.footer}>
      <Button
        title="Confirmer l'annulation"
        variant="destructive"
        size="lg"
        fullWidth
        loading={mut.isPending}
        disabled={!isPatient && !canSubmitStaff}
        onPress={() => mut.mutate()}
      />
      <Button title="Retour" variant="outline" size="lg" fullWidth onPress={onClose} />
    </View>
  );

  return (
    <SheetModal
      visible={sheetVisible}
      presentKey={presentKey}
      onClose={onClose}
      onDismissed={handleSheetDismissed}
      title={title}
      subtitle={subtitle}
      footer={footer}
    >
      <View style={styles.summaryCard}>
        <View style={styles.warningStrip}>
          <AlertTriangle size={16} color={colors.error} strokeWidth={2.25} />
          <Text style={styles.warningText}>
            {isBatch
              ? `${targets.length} rendez-vous seront définitivement annulés.`
              : 'Cette action est irréversible.'}
          </Text>
        </View>

        {targetLabel && !isBatch ? (
          <>
            <View style={styles.summaryDivider} />
            <View style={styles.targetRow}>
              <View style={styles.targetIcon}>
                <CalendarX2 size={16} color={colors.primary} strokeWidth={2.25} />
              </View>
              <View style={styles.targetCopy}>
                <Text style={styles.targetKicker}>Rendez-vous concerné</Text>
                <Text style={styles.targetName} numberOfLines={2}>
                  {targetLabel}
                </Text>
              </View>
            </View>
          </>
        ) : null}
      </View>

      {!isPatient ? (
        <View style={styles.formSection}>
          <Text style={styles.formTitle}>Motif d'annulation</Text>
          <StaffCancellationFields values={staff} onChange={patchStaff} onPickPhoto={beginPhotoPick} />
        </View>
      ) : null}
    </SheetModal>
  );
}

function buildStyles(c: AppColors) {
  return {
  summaryCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.borderLight,
    overflow: 'hidden',
    backgroundColor: c.surface,
  },
  warningStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: c.errorLight,
  },
  warningText: {
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.error,
    lineHeight: fontSize.xs * 1.45,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.borderLight,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
  },
  targetIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: c.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  targetCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  targetKicker: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  targetName: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  formSection: {
    gap: spacing[3],
  },
  formTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  footer: {
    gap: spacing[2],
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_appointments_detail_components_blocks_CancelAppointmentSheet_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});

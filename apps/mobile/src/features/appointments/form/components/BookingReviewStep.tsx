import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Info } from 'lucide-react-native';
import type { SelectedServiceInput } from '@oneandlab/shared-utils';
import { Row } from '@/components/layout/primitives';
import type { CareCategory } from '@/features/categories/api/categories.service';
import { useAppColors } from '@/theme/use-app-colors';
import { AppText, font, iconSize, radius, spacing, useStyles, type Theme } from '@/theme';
import { detailLinesForSelectedService } from '../utils/selected-service-detail-lines';
import { bookingReviewSlots } from '../utils/booking-review-summary';
import { vipStoreLabel } from '../utils/booking-wizard-titles';

interface Props {
  mode: 'patient' | 'dashboard';
  selectedServices: SelectedServiceInput[];
  categories: CareCategory[];
  formDataByService: Record<string, Record<string, unknown>>;
  slotRows: SelectedServiceInput[];
  /** `null` quand l'étape laboratoire ne s'applique pas. */
  labSummary: string | null;
  beneficiary: { name: string; detail: string };
  address: { label: string; complement: string } | null;
  /** Prix du store quand la demande déclenche un paiement « Prioritaire ». */
  vipPriceLabel: string | null;
  requiresFasting: boolean;
  onEditServices: () => void;
  onEditLab: () => void;
  onEditSlot: (index: number) => void;
  onEditPersonal: () => void;
}

function EditLink({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useStyles(buildStyles);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.editHit}
    >
      <AppText style={styles.editText}>Modifier</AppText>
    </Pressable>
  );
}

function ReviewSection({
  title,
  editLabel,
  onEdit,
  children,
  first = false,
}: {
  title: string;
  editLabel?: string;
  onEdit?: () => void;
  children: ReactNode;
  first?: boolean;
}) {
  const styles = useStyles(buildStyles);
  return (
    <View style={[styles.section, !first && styles.sectionDivider]}>
      <Row align="center" justify="between" gap={spacing[2]}>
        <AppText style={styles.sectionTitle} accessibilityRole="header">{title}</AppText>
        {onEdit && editLabel ? <EditLink label={editLabel} onPress={onEdit} /> : null}
      </Row>
      {children}
    </View>
  );
}

/** Étape « Vérifier et confirmer » : chaque bloc renvoie vers l'étape qui le modifie. */
export function BookingReviewStep({
  mode,
  selectedServices,
  categories,
  formDataByService,
  slotRows,
  labSummary,
  beneficiary,
  address,
  vipPriceLabel,
  requiresFasting,
  onEditServices,
  onEditLab,
  onEditSlot,
  onEditPersonal,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const slots = bookingReviewSlots(slotRows, selectedServices, formDataByService);
  const singleSlot = slots.length === 1;

  return (
    <View style={styles.root}>
      <AppText style={styles.lead}>
        {mode === 'patient'
          ? 'Relisez votre demande avant de la confirmer.'
          : 'Relisez la demande avant de créer le rendez-vous.'}
      </AppText>

      <View style={styles.card}>
        <ReviewSection first title="Soins" editLabel="Modifier les soins" onEdit={onEditServices}>
          {selectedServices.map((svc) => {
            const lines = detailLinesForSelectedService(svc, categories, formDataByService);
            return (
              <View key={svc.id} style={styles.item}>
                <AppText style={styles.value}>{svc.name}</AppText>
                {lines.map((line) => (
                  <AppText key={`${svc.id}-${line.label}`} style={styles.meta}>
                    {line.label} : {line.value}
                  </AppText>
                ))}
              </View>
            );
          })}
        </ReviewSection>

        {labSummary ? (
          <ReviewSection title="Laboratoire" editLabel="Modifier le laboratoire" onEdit={onEditLab}>
            <AppText style={styles.value}>{labSummary}</AppText>
          </ReviewSection>
        ) : null}

        <ReviewSection
          title="Date et créneau"
          editLabel={singleSlot ? 'Modifier la date et le créneau' : undefined}
          onEdit={singleSlot ? () => onEditSlot(0) : undefined}
        >
          {slots.map((slot, index) => (
            <Row key={slot.serviceId} align="start" justify="between" gap={spacing[2]}>
              <View style={styles.item}>
                {!singleSlot ? <AppText style={styles.meta}>{slot.title}</AppText> : null}
                <AppText style={styles.value}>{slot.dateLabel}</AppText>
                <AppText style={styles.meta}>{slot.timeLabel}</AppText>
              </View>
              {!singleSlot ? (
                <EditLink label={`Modifier le créneau : ${slot.title}`} onPress={() => onEditSlot(index)} />
              ) : null}
            </Row>
          ))}
        </ReviewSection>

        <ReviewSection
          title={mode === 'patient' ? 'Pour qui' : 'Patient'}
          editLabel={mode === 'patient' ? 'Modifier le bénéficiaire' : 'Modifier le patient'}
          onEdit={onEditPersonal}
        >
          <AppText style={styles.value}>{beneficiary.name}</AppText>
          {beneficiary.detail ? <AppText style={styles.meta}>{beneficiary.detail}</AppText> : null}
        </ReviewSection>

        <ReviewSection title="Adresse du rendez-vous" editLabel="Modifier l’adresse" onEdit={onEditPersonal}>
          {address ? (
            <>
              <AppText style={styles.value}>{address.label}</AppText>
              {address.complement ? <AppText style={styles.meta}>{address.complement}</AppText> : null}
            </>
          ) : (
            <AppText style={styles.missing}>Adresse à renseigner</AppText>
          )}
        </ReviewSection>

        {mode === 'patient' ? (
          <ReviewSection title="Paiement">
            {vipPriceLabel ? (
              <>
                <AppText style={styles.value}>Supplément prioritaire : {vipPriceLabel}</AppText>
                <AppText style={styles.meta}>
                  Réglé via {vipStoreLabel()} au moment de réserver.
                </AppText>
              </>
            ) : (
              <AppText style={styles.value}>Aucun paiement à la réservation</AppText>
            )}
          </ReviewSection>
        ) : null}
      </View>

      {requiresFasting ? (
        <Row align="start" gap={spacing[2]} style={styles.notice}>
          <Info size={iconSize.sm} color={c.primaryDark} strokeWidth={2.2} />
          <AppText style={styles.noticeText}>
            {mode === 'patient'
              ? 'Prélèvement à jeun : suivez les consignes de votre ordonnance avant le rendez-vous.'
              : 'Prélèvement à jeun indiqué dans la demande : prévenez le patient.'}
          </AppText>
        </Row>
      ) : null}
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    root: { gap: spacing[4] },
    lead: {
      ...font.regular,
      fontSize: fontSize.base,
      lineHeight: fontSize.base * 1.45,
      color: c.textSecondary,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.borderLight,
      paddingHorizontal: spacing[4],
    },
    section: { gap: spacing[2], paddingVertical: spacing[4] },
    sectionDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    sectionTitle: {
      ...font.semiBold,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    editHit: {
      minHeight: 44,
      minWidth: 44,
      justifyContent: 'center' as const,
      alignItems: 'flex-end' as const,
      marginVertical: -spacing[2],
    },
    editText: {
      ...font.semiBold,
      fontSize: fontSize.sm,
      color: c.textLink,
    },
    item: { minWidth: 0, flex: 1, gap: 2 },
    value: {
      ...font.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    meta: {
      ...font.regular,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.4,
      color: c.textSecondary,
    },
    missing: {
      ...font.medium,
      fontSize: fontSize.base,
      color: c.error,
    },
    notice: {
      padding: spacing[3],
      borderRadius: radius.lg,
      backgroundColor: c.primaryLight,
    },
    noticeText: {
      minWidth: 0,
      flex: 1,
      ...font.medium,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.45,
      color: c.textPrimary,
    },
  };
}

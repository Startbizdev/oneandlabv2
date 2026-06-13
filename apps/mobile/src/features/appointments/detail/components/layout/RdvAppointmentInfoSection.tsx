import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useMemo } from 'react';
import { Mail, MessageCircle, Phone, User } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import type { Appointment, AuthUser } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { Cluster, Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { SkeletonRdvCarePlaceholder } from '@/components/ui/skeletons';
import { useAppointmentCareCategories } from '@/features/appointments/detail/hooks/use-appointment-care-categories';
import { RdvAddressFieldRow } from '../RdvAddressFieldRow';
import {
  buildRdvBaseRows,
  buildRdvCareRows,
  type RdvInfoRow,
} from '../../utils/build-rdv-info-rows';
import {
  resolveAppointmentDetailAddressLine,
} from '../../utils/appointment-address-display';
import { buildPatientContactButtons } from '@/utils/contact-actions';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { getRdvDetailSectionStyles } from './rdv-detail-section-styles';

interface Props {
  apt: Appointment;
  viewer?: AuthUser | null;
  edgeToEdge?: boolean;
  /** @deprecated Préférer `batch` pour les lots. */
  omitCareFields?: boolean;
  /** Actes liés : soins regroupés dans cette carte (même UX que RDV simple). */
  batch?: Appointment[];
  /** Lot multi-RDV : attendre le chargement des fratries avant d’afficher. */
  batchLoading?: boolean;
  /** Boutons carte / Waze (pro, infirmier). */
  showMapActions?: boolean;
  /** Bouton « Voir le profil » (pro / infirmier). */
  onViewPatientProfile?: () => void;
}

const CONTACT_ICONS = {
  phone: Phone,
  message: MessageCircle,
  email: Mail,
} as const;

function splitRowsForCareInsert(rows: RdvInfoRow[]): {
  beforeCare: RdvInfoRow[];
  afterCare: RdvInfoRow[];
} {
  const dateIdx = rows.findIndex((r) => r.kind === 'field' && r.label === 'Date & créneau');
  if (dateIdx >= 0) {
    return {
      beforeCare: rows.slice(0, dateIdx + 1),
      afterCare: rows.slice(dateIdx + 1),
    };
  }
  return { beforeCare: [], afterCare: rows };
}

function expectsCareRows(apt: Appointment, omitCareFields: boolean, batch?: Appointment[]) {
  if (omitCareFields && (batch?.length ?? 0) <= 1) return false;
  return isNursingAppointment(apt.type) || isBloodTestAppointment(apt.type);
}

function hasBatchSiblings(apt: Appointment): boolean {
  const sibs = apt.batch_siblings;
  return Array.isArray(sibs) && sibs.length > 0;
}

function InfoRow({
  row,
  index,
  onViewPatientProfile,
}: {
  row: RdvInfoRow;
  index: number;
  onViewPatientProfile?: () => void;
}) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'RdvAppointmentInfoSection.InfoRow');
  if (row.kind === 'address') return null;

  return (
    <View
      style={[
        getRdvDetailSectionStyles().sectionRow,
        styles.infoRow,
        index > 0 && getRdvDetailSectionStyles().rowBorder,
      ]}
    >
      {row.kind === 'identity' ? (
        <>
          <Text style={styles.label}>{row.identityLabel ?? 'Patient'}</Text>
          <View style={styles.identityBlock}>
            <Row gap={spacing[2.5]} align="center">
              <ProfileAvatar
                profileImageUrl={row.profileImageUrl}
                seed={
                  row.avatarSeed ??
                  [row.firstName, row.lastName].filter((p) => p && p !== '—').join(' ')
                }
                gender={row.gender}
                size={40}
              />
              <Text style={styles.value}>
                {[row.firstName, row.lastName].filter(Boolean).join(' ')}
              </Text>
            </Row>
            {onViewPatientProfile ? (
              <Button
                title="Voir le profil"
                variant="muted"
                size="sm"
                leftIcon={<User size={13} color={c.textSecondary} strokeWidth={2.25} />}
                onPress={onViewPatientProfile}
                style={styles.profileButton}
                accessibilityLabel={`Voir le profil de ${[row.firstName, row.lastName].filter(Boolean).join(' ')}`}
              />
            ) : null}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.label}>{row.label}</Text>
          <Row align="start" wrap gap={6}>
            {row.emoji ? (
              <Text style={styles.valueEmoji} accessibilityElementsHidden>
                {row.emoji}
              </Text>
            ) : null}
            <Text style={[styles.value, row.strikethrough && styles.valueMuted]}>
              {row.value}
            </Text>
          </Row>
        </>
      )}
    </View>
  );
}

export function RdvAppointmentInfoSection({
  apt,
  viewer,
  edgeToEdge = false,
  omitCareFields = false,
  batch,
  batchLoading = false,
  showMapActions = false,
  onViewPatientProfile,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_layout_RdvAppointmentInfoSection_tsx_RdvAppointmentInfoSection_styles');

  const categoriesQ = useAppointmentCareCategories();
  const categories = categoriesQ.data;
  const catalogReady = categoriesQ.isFetched;
  const multiBatch = hasBatchSiblings(apt);
  const addressLine = useMemo(
    () => resolveAppointmentDetailAddressLine(apt, batch),
    [apt, batch],
  );
  const addressPending = multiBatch && batchLoading && !addressLine;
  const addressRowVisible = Boolean(addressLine) || addressPending;

  const baseRowsRaw = useMemo(
    () => buildRdvBaseRows(apt, viewer, batch),
    [apt, viewer, batch],
  );

  const baseRows = baseRowsRaw;

  const careRows = useMemo(() => {
    if (batchLoading && multiBatch) return [];
    return buildRdvCareRows(apt, { omitCareFields, categories, batch });
  }, [apt, omitCareFields, categories, batch, batchLoading, multiBatch]);

  const { beforeCare, afterCare } = useMemo(
    () => splitRowsForCareInsert(baseRows),
    [baseRows],
  );

  const contactButtons = useMemo(
    () => buildPatientContactButtons(apt, viewer),
    [apt, viewer],
  );

  const needsCare = expectsCareRows(apt, omitCareFields, batch);
  const carePending =
    needsCare &&
    careRows.length === 0 &&
    (multiBatch ? batchLoading : !catalogReady);

  const hasContent =
    beforeCare.length > 0 ||
    afterCare.length > 0 ||
    careRows.length > 0 ||
    carePending ||
    addressRowVisible ||
    contactButtons.length > 0;

  if (!hasContent) return null;

  let rowIndex = addressRowVisible ? 1 : 0;

  return (
    <View style={[getRdvDetailSectionStyles().card, edgeToEdge && getRdvDetailSectionStyles().cardEdge]}>
      <View>
        {addressRowVisible ? (
          <RdvAddressFieldRow
            apt={apt}
            batch={batch}
            batchLoading={batchLoading}
            showMapActions={showMapActions}
            rowIndex={0}
          />
        ) : null}

        {beforeCare.map((row) => {
          const el = (
            <InfoRow
              key={`${row.kind}-${rowIndex}`}
              row={row}
              index={rowIndex}
              onViewPatientProfile={row.kind === 'identity' ? onViewPatientProfile : undefined}
            />
          );
          rowIndex += 1;
          return el;
        })}

        {careRows.map((row) => {
          const el = (
            <InfoRow
              key={`care-${row.kind}-${rowIndex}-${'label' in row ? row.label : ''}`}
              row={row}
              index={rowIndex}
            />
          );
          rowIndex += 1;
          return el;
        })}

        {carePending ? <SkeletonRdvCarePlaceholder count={3} /> : null}

        {afterCare.map((row) => {
          const el = (
            <InfoRow
              key={`${row.kind}-${rowIndex}-${'label' in row ? row.label : ''}`}
              row={row}
              index={rowIndex}
              onViewPatientProfile={row.kind === 'identity' ? onViewPatientProfile : undefined}
            />
          );
          rowIndex += 1;
          return el;
        })}

        {contactButtons.length > 0 ? (
          <View
            style={[
              getRdvDetailSectionStyles().sectionRow,
              styles.actionsRow,
              rowIndex > 0 && getRdvDetailSectionStyles().rowBorder,
            ]}
          >
            <Row gap={spacing[1.5]}>
              {contactButtons.map((btn) => {
                const Icon = CONTACT_ICONS[btn.icon];
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
          </View>
        ) : null}
      </View>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  infoRow: {
    gap: spacing[1],
  },
  identityBlock: {
    gap: spacing[2],
  },
  profileButton: {
    alignSelf: 'flex-start' as const,
  },
  actionsRow: {
    paddingVertical: spacing[3],
  },
  buttonCell: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  valueEmoji: {
    fontSize: 20,
    lineHeight: 24,
  },
  value: {
    minWidth: 0,
    flexShrink: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: c.textPrimary,
    lineHeight: fontSize.base * 1.35,
  },
  valueMuted: {
    textDecorationLine: 'line-through' as const,
    color: c.textSecondary,
    fontFamily: fontFamily.regular,
  },
};
}

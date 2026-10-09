import { useAppColors } from '@/theme/use-app-colors';
import { useMemo } from 'react';
import { Mail, MessageCircle, Phone, User } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import type { Appointment, AuthUser } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { Cluster, Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { SkeletonRdvCarePlaceholder } from '@/components/ui/skeletons';
import { useAppointmentCareCategories } from '@/features/appointments/detail/hooks/use-appointment-care-categories';
import { CareIcon } from '@/features/categories/components/CareIcon';
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
import { ICON_STROKE_WIDTH, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';
import { useRdvDetailSectionStyles } from './rdv-detail-section-styles';

interface Props {
  apt: Appointment;
  viewer?: AuthUser | null;
  /** @deprecated Préférer `batch` pour les lots. */
  omitCareFields?: boolean;
  /** Actes liés : soins regroupés dans cette carte (même UX que RDV simple). */
  batch?: Appointment[];
  /** Lot multi-RDV : attendre le chargement des fratries avant d’afficher. */
  batchLoading?: boolean;
  /** Boutons carte / itinéraire (rôles non patient). */
  showMapActions?: boolean;
  /** Bouton « Voir le profil » (pro / infirmier). */
  onViewPatientProfile?: () => void;
  /** Libellé custom du bouton profil (ex. « Dossier de X » pour le RDV d’un proche). */
  viewPatientProfileLabel?: string;
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
  viewPatientProfileLabel,
}: {
  row: RdvInfoRow;
  index: number;
  onViewPatientProfile?: () => void;
  viewPatientProfileLabel?: string;
}) {
  const section = useRdvDetailSectionStyles();
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  if (row.kind === 'address') return null;
  const continuesPrevious = row.kind !== 'identity' && !row.label;

  return (
    <View
      style={[
        section.sectionRow,
        styles.infoRow,
        index > 0 && !continuesPrevious && section.rowBorder,
        continuesPrevious && styles.continuationRow,
      ]}
    >
      {row.kind === 'identity' ? (
        <>
          <AppText style={section.fieldLabel}>{row.identityLabel ?? 'Patient'}</AppText>
          <View style={styles.identityBlock}>
            <Row gap={spacing[3]} align="center">
              <ProfileAvatar
                profileImageUrl={row.profileImageUrl}
                seed={
                  row.avatarSeed ??
                  [row.firstName, row.lastName].filter((p) => p && p !== '—').join(' ')
                }
                gender={row.gender}
                size={iconSize['2xl']}
              />
              <AppText style={styles.value}>
                {[row.firstName, row.lastName].filter(Boolean).join(' ')}
              </AppText>
            </Row>
            {onViewPatientProfile ? (
              <Button
                title={viewPatientProfileLabel ?? 'Voir le profil'}
                variant="muted"
                size="sm"
                leftIcon={<User size={iconSize.sm} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />}
                onPress={onViewPatientProfile}
                style={styles.profileButton}
                accessibilityLabel={
                  viewPatientProfileLabel ??
                  `Voir le profil de ${[row.firstName, row.lastName].filter(Boolean).join(' ')}`
                }
              />
            ) : null}
          </View>
        </>
      ) : (
        <>
          {continuesPrevious ? null : <AppText style={section.fieldLabel}>{row.label}</AppText>}
          <Row align="center" gap={spacing[1.5]}>
            {row.care ? <CareIcon care={row.care} /> : null}
            <AppText style={[styles.value, row.strikethrough && styles.valueMuted]}>
              {row.value}
            </AppText>
          </Row>
        </>
      )}
    </View>
  );
}

export function RdvAppointmentInfoSection({
  apt,
  viewer,
  omitCareFields = false,
  batch,
  batchLoading = false,
  showMapActions = false,
  onViewPatientProfile,
  viewPatientProfileLabel,
}: Props) {
  const section = useRdvDetailSectionStyles();
  const c = useAppColors();
  const styles = useStyles(buildStyles);

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
    <View style={section.card}>
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
              viewPatientProfileLabel={row.kind === 'identity' ? viewPatientProfileLabel : undefined}
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
              viewPatientProfileLabel={row.kind === 'identity' ? viewPatientProfileLabel : undefined}
            />
          );
          rowIndex += 1;
          return el;
        })}

        {contactButtons.length > 0 ? (
          <View
            style={[
              section.sectionRow,
              styles.actionsRow,
              rowIndex > 0 && section.rowBorder,
            ]}
          >
            <Row gap={spacing[1.5]} wrap>
              {contactButtons.map((btn) => {
                const Icon = CONTACT_ICONS[btn.icon];
                return (
                  <View key={btn.key} style={styles.buttonCell}>
                    <Button
                      title={btn.label}
                      size="sm"
                      variant="secondary"
                      leftIcon={<Icon size={iconSize.sm} color={c.textLink} strokeWidth={ICON_STROKE_WIDTH} />}
                      onPress={btn.onPress}
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

function buildStyles({ colors: c, text }: Theme) {
  return {
  infoRow: {
    gap: spacing[1],
  },
  continuationRow: {
    paddingTop: 0,
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
    flexGrow: 1,
  },
  value: {
    minWidth: 0,
    flexShrink: 1,
    ...text.body,
    ...font.medium,
    color: c.textPrimary,
  },
  valueMuted: {
    textDecorationLine: 'line-through' as const,
    color: c.textSecondary,
    ...font.regular,
  },
};
}

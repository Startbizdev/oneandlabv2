import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { StyleSheet, View } from 'react-native';
import type { Appointment } from '@oneandlab/shared-types';
import type { AuthUser } from '@oneandlab/shared-types';
import type { CareCategory } from '@/features/categories/api/categories.service';
import { useAppointmentCareCategories } from '@/features/appointments/detail/hooks/use-appointment-care-categories';
import {
  buildAppointmentDetailKvRows,
  isAppointmentCanceled,
} from '@/utils/appointment-detail-display';
import { RdvCancellationBanner } from './RdvCancellationBanner';
import { StaffPatientKvSection } from './StaffPatientKvSection';
import { PatientAssigneeRows } from './patient/PatientAssigneeRows';
import { DetailInfoStack } from './layout/DetailInfoStack';
import { DetailSection } from './layout/DetailSection';
import { spacing } from '@/theme';

function CareInfoStack({
  apt,
  titleContext,
  categories,
}: {
  apt: Appointment;
  titleContext?: string | null;
  categories?: CareCategory[];
}) {
  const items = buildAppointmentDetailKvRows(apt, {
    hideAddress: true,
    hideScheduledDate: true,
    hideCreatedAt: true,
    titleContext,
    categories,
  })
    .filter((r) => r.value)
    .map((r) => ({
      label: r.label,
      value: r.value,
      muted: Boolean(r.strikethrough),
    }));

  return <DetailInfoStack items={items} />;
}

interface Props {
  batch: Appointment[];
  primary: Appointment;
  isMultiBatch: boolean;
  role: string;
  viewer?: AuthUser | null;
  showPatientRows?: boolean;
  showAssignee?: boolean;
  embedded?: boolean;
}

/** Complément prise en charge (RDV simple). Les lots passent par `RdvAppointmentInfoSection`. */
export function RdvUnifiedInfoCard({
  primary,
  isMultiBatch,
  role: _role,
  viewer: _viewer,
  showPatientRows = true,
  showAssignee = true,
  embedded = false,
}: Props) {
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_RdvUnifiedInfoCard_tsx_RdvUnifiedInfoCard_styles');

  const titleContext = primary.category_name ?? null;
  const categoriesQ = useAppointmentCareCategories();
  const categories = categoriesQ.data;

  if (isMultiBatch) return null;

  const canceled = isAppointmentCanceled(primary.status);
  const extraContacts = showPatientRows ? (
    <StaffPatientKvSection apt={primary} />
  ) : null;
  const care = (
    <CareInfoStack apt={primary} titleContext={titleContext} categories={categories} />
  );
  const hasCare = buildAppointmentDetailKvRows(primary, {
    hideAddress: true,
    hideScheduledDate: true,
    hideCreatedAt: true,
    titleContext,
    categories,
  }).some((r) => r.value);

  if (!extraContacts && !hasCare && !showAssignee) return null;

  return (
    <View style={styles.wrap}>
      {canceled && !embedded ? (
        <RdvCancellationBanner apt={primary} />
      ) : null}
      {showAssignee ? <PatientAssigneeRows apt={primary} /> : null}
      <DetailSection title={embedded ? 'Prise en charge' : undefined} plain={embedded}>
        {extraContacts}
        {hasCare ? care : null}
      </DetailSection>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: { gap: spacing[3] },
};
}

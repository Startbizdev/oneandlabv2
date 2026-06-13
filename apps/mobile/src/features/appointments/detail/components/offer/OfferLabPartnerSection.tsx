import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FlaskConical } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { AssigneeProfileRow } from '../AssigneeProfileRow';
import { ProviderPublicProfileSheet } from '@/features/profile/components/ProviderPublicProfileSheet';
import type { OfferLabPartner } from '../../utils/offer-appointment-display';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  lab: OfferLabPartner;
}

export function OfferLabPartnerSection({
  lab }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_offer_OfferLabPartnerSection_tsx_styles');
  const [sheetOpen, setSheetOpen] = useState(false);
  const slug = lab.publicSlug?.trim();

  return (
    <>
      <View style={styles.wrap}>
        <Row align="center" gap={spacing[2]} style={styles.head}>
          <FlaskConical size={14} color={c.primary} strokeWidth={2} />
          <Text style={styles.headTitle}>Laboratoire associé</Text>
        </Row>
        <Text style={styles.hint}>
          Ce laboratoire a déjà accepté la prise en charge sur ce rendez-vous.
        </Text>
        <AssigneeProfileRow
          title={lab.roleLabel ?? 'Laboratoire'}
          name={lab.displayName}
          profileImageUrl={lab.profileImageUrl}
          phone={lab.phone}
          onViewProfile={slug ? () => setSheetOpen(true) : undefined}
        />
      </View>
      {slug ? (
        <ProviderPublicProfileSheet
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          providerType="lab"
          slug={slug}
          title={lab.displayName}
          phone={lab.phone}
        />
      ) : null}
    </>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.primaryMid,
    backgroundColor: c.primaryLight,
    padding: spacing[4],
    gap: spacing[2],
  },
  head: {
    minWidth: 0,
  },
  headTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.primary,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    lineHeight: fontSize.xs * 1.45,
  },
};
}


import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AssigneeProfileRow } from '../AssigneeProfileRow';
import { ProviderPublicProfileSheet } from '@/features/profile/components/ProviderPublicProfileSheet';
import type { OfferLabPartner } from '../../utils/offer-appointment-display';
import { radius, spacing, AppText, useStyles, type Theme } from '@/theme';

interface Props {
  lab: OfferLabPartner;
}

export function OfferLabPartnerSection({ lab }: Props) {
  const styles = useStyles(buildStyles);
  const [sheetOpen, setSheetOpen] = useState(false);
  const slug = lab.publicSlug?.trim();

  return (
    <>
      <View style={styles.wrap}>
        <AppText variant="caption">Laboratoire déjà engagé sur ce rendez-vous</AppText>
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

function buildStyles({ colors: c }: Theme) {
  return {
    wrap: {
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      backgroundColor: c.surface,
      padding: spacing[4],
      gap: spacing[2],
    },
  };
}

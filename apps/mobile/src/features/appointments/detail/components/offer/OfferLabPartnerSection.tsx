import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FlaskConical } from 'lucide-react-native';
import { AssigneeProfileRow } from '../AssigneeProfileRow';
import { ProviderPublicProfileSheet } from '../ProviderPublicProfileSheet';
import type { OfferLabPartner } from '../../utils/offer-appointment-display';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  lab: OfferLabPartner;
}

export function OfferLabPartnerSection({ lab }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const slug = lab.publicSlug?.trim();

  return (
    <>
      <View style={styles.wrap}>
        <View style={styles.head}>
          <FlaskConical size={14} color={colors.primary} strokeWidth={2} />
          <Text style={styles.headTitle}>Laboratoire associé</Text>
        </View>
        <Text style={styles.hint}>
          Ce laboratoire a déjà accepté la prise en charge sur ce rendez-vous.
        </Text>
        <AssigneeProfileRow
          title={lab.roleLabel ?? 'Laboratoire'}
          name={lab.displayName}
          profileImageUrl={lab.profileImageUrl}
          phone={lab.phone}
          publicSlug={slug}
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
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primaryMid,
    backgroundColor: colors.primaryLight,
    padding: spacing[4],
    gap: spacing[2],
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.45,
  },
});

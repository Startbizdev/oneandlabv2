import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Scale } from 'lucide-react-native';
import { LEGAL_PAGES } from '@/constants/legal-pages';
import { ProfileNavRow } from '@/features/profile/components/ProfileNavRow';
import { ProfileStackBackButton } from '@/navigation/ProfileStackBackButton';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  /** Préfixe de route expo, ex. `/(nurse)` */
  rolePrefix: string;
}

export function LegalInformationScreen({ rolePrefix }: Props) {
  const router = useRouter();
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Informations légales',
          headerTitleAlign: 'left',
          headerLeft: () => <ProfileStackBackButton />,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          Consultez les documents légaux de Cary. Ils s’ouvrent dans le même format que sur le site
          web.
        </Text>
        <View style={[styles.card, elevation.xs]}>
          {LEGAL_PAGES.map((page, index) => (
            <View key={page.slug}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <ProfileNavRow
                icon={Scale}
                title={page.label}
                subtitle={page.description}
                onPress={() =>
                  router.push(
                    `${rolePrefix}/web?path=${encodeURIComponent(page.path)}&title=${encodeURIComponent(page.label)}` as never,
                  )
                }
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[10],
    gap: spacing[4],
  },
  lead: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.45,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
    marginLeft: spacing[4] + 40 + spacing[3],
  },
});

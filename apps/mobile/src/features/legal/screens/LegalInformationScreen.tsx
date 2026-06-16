import type { AppColors } from '@/theme/colors';

import { useThemedStyles } from '@/theme/use-themed-styles';

import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useRouter } from 'expo-router';

import { Scale } from 'lucide-react-native';

import { LEGAL_PAGES } from '@/constants/legal-pages';

import { ProfileNavRow } from '@/features/profile/components/ProfileNavRow';

import { spreadTabSceneScrollProps } from '@/components/navigation/liquid-glass-header-inset';

import { StackChromeScreen } from '@/navigation/StackChromeScreen';

import { useStackScrollConfig } from '@/navigation/use-stack-scroll-config';

import { elevation, radius, spacing } from '@/theme';

import { fontFamily, fontSize } from '@/theme/typography';



interface Props {

  /** Préfixe de route expo, ex. `/(nurse)` */

  rolePrefix: string;

}



export function LegalInformationScreen({ rolePrefix }: Props) {

  const styles = useThemedStyles(buildStyles, 'features_legal_screens_LegalInformationScreen_tsx_LegalInformationScreen_styles');



  const router = useRouter();

  const scrollConfig = useStackScrollConfig(styles.scroll);



  return (

    <StackChromeScreen>

      <ScrollView

        {...spreadTabSceneScrollProps(scrollConfig)}

        contentContainerStyle={scrollConfig.contentContainerStyle}

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

    </StackChromeScreen>

  );

}



function buildStyles(c: AppColors) {

  return {

  scroll: {

    paddingHorizontal: spacing[4],

    paddingTop: spacing[4],

    paddingBottom: spacing[10],

    gap: spacing[4],

  },

  lead: {

    fontFamily: fontFamily.regular,

    fontSize: fontSize.sm,

    color: c.textSecondary,

    lineHeight: fontSize.sm * 1.45,

  },

  card: {

    backgroundColor: c.surface,

    borderRadius: radius.xl,

    borderWidth: 1,

    borderColor: c.borderLight,

    overflow: 'hidden' as const,

  },

  divider: {

    height: StyleSheet.hairlineWidth,

    backgroundColor: c.borderLight,

    marginLeft: spacing[4] + 40 + spacing[3],

  },

};

}



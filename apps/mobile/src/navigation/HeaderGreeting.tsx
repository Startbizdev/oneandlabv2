import type { AppColors } from '@/theme/colors';

import { useThemedStyles } from '@/theme/use-themed-styles';

import { Platform, Text, View } from 'react-native';

import { useAuthStore } from '@/store/auth-store';

import { fontFamily, fontSize } from '@/theme/typography';



function formatFirstName(raw?: string | null): string {

  const trimmed = raw?.trim();

  if (!trimmed) return 'vous';

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();

}



/** Salutation onglet RDV — même gabarit typographique que les autres titres. */

export function HeaderGreeting() {

  const styles = useThemedStyles(buildStyles, 'navigation_HeaderGreeting_tsx_HeaderGreeting_styles');

  const firstName = useAuthStore((s) => s.user?.first_name);



  return (

    <View style={styles.wrap}>

      <Text style={styles.text} numberOfLines={1}>

        Bonjour {formatFirstName(firstName)} !

      </Text>

    </View>

  );

}



function buildStyles(c: AppColors) {

  return {

    wrap: {

      flex: 1,

      minWidth: 0,

      justifyContent: 'center' as const,

    },

    text: {

      fontFamily: fontFamily.bold,

      fontSize: Platform.select({ ios: 22, default: fontSize.lg }),

      lineHeight: Platform.select({ ios: 28, default: fontSize.lg * 1.2 }),

      color: c.textPrimary,

      letterSpacing: Platform.select({ ios: -0.4, default: -0.3 }),

      flexShrink: 1,

    },

  };

}



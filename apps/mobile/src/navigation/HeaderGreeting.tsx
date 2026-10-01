

import { Platform, View } from 'react-native';

import { useAuthStore } from '@/store/auth-store';

import { AppText, useStyles, font, type Theme } from '@/theme';



function formatFirstName(raw?: string | null): string {

  const trimmed = raw?.trim();

  if (!trimmed) return 'vous';

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();

}



/** Salutation onglet RDV — même gabarit typographique que les autres titres. */

export function HeaderGreeting() {

  const styles = useStyles(buildStyles);

  const firstName = useAuthStore((s) => s.user?.first_name);



  return (

    <View style={styles.wrap}>

      <AppText style={styles.text} numberOfLines={1}>

        Bonjour {formatFirstName(firstName)} !

      </AppText>

    </View>

  );

}



function buildStyles({ colors: c, fontSize }: Theme) {

  return {

    wrap: {

      flex: 1,

      minWidth: 0,

      justifyContent: 'center' as const,

    },

    text: {

      minWidth: 0,

      ...font.bold,

      fontSize: Platform.select({ ios: 22, default: fontSize.lg }),

      lineHeight: Platform.select({ ios: 28, default: fontSize.lg * 1.2 }),

      color: c.textPrimary,

      letterSpacing: Platform.select({ ios: -0.4, default: -0.3 }),

      flexShrink: 1,

    },

  };

}



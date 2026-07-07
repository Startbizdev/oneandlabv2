import type { AppColors } from '@/theme/colors';

import { useThemedStyles } from '@/theme/use-themed-styles';

import type { ReactElement } from 'react';

import { Platform, View } from 'react-native';

import type { LucideIcon } from 'lucide-react-native';

import type { SFSymbol } from 'sf-symbols-typescript';

import { AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';



interface HeaderTitleProps {

  title: string;

}



/** Titre header — texte seul (sans icône). */

export function HeaderTitleText({ title }: HeaderTitleProps) {

  const styles = useThemedStyles(buildStyles, 'navigation_HeaderTitle_tsx_HeaderTitleText_styles');



  return (

    <View style={styles.wrap}>

      <AppText style={styles.title} numberOfLines={1}>

        {title}

      </AppText>

    </View>

  );

}



/** @deprecated Préférer `HeaderTitleText` — icônes retirées du header. */

export function HeaderTitleWithIcon({

  title,

  symbol: _symbol,

  fallbackIcon: _fallbackIcon,

}: {

  title: string;

  symbol?: SFSymbol;

  fallbackIcon?: LucideIcon;

}) {

  return <HeaderTitleText title={title} />;

}



/** Titre header stack — compat React Navigation. */

export function tabHeaderTitle(

  title: string,

  _symbol?: SFSymbol,

  _fallbackIcon?: LucideIcon,

): (props: { tintColor?: string }) => ReactElement {

  return () => <HeaderTitleText title={title} />;

}



function buildStyles(c: AppColors) {

  return {

    wrap: {

      flex: 1,

      minWidth: 0,

      justifyContent: 'center' as const,

    },

    title: {

      fontFamily: fontFamily.bold,

      fontSize: Platform.select({ ios: 22, default: fontSize.lg }),

      lineHeight: Platform.select({ ios: 28, default: fontSize.lg * 1.2 }),

      color: c.textPrimary,

      letterSpacing: Platform.select({ ios: -0.4, default: -0.3 }),

      flexShrink: 1,

      minWidth: 0,

    },

  };

}



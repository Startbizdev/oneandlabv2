import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import React, { type ReactNode } from 'react';
import { View, StyleSheet, type ScrollViewProps, type ViewStyle } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { KeyboardScrollView } from './KeyboardScrollView';
import { ResponsiveContent } from './ResponsiveContent';
import { spacing } from '@/theme';

/**
 * Conteneur d'écran sans SafeAreaView.
 * La safe area haut/bas est gérée par React Navigation (header + tab bar).
 * @see https://reactnavigation.org/docs/handling-safe-area/
 */
interface BaseScreenProps {
  children: ReactNode;
  style?: ViewStyle;
  backgroundColor?: string;
}

interface StaticScreenProps extends BaseScreenProps {
  scroll?: false;
  contentStyle?: ViewStyle;
  keyboardAvoiding?: boolean;
  /** Limite la largeur de contenu sur grands écrans (défaut: true). */
  responsive?: boolean;
}

interface ScrollScreenProps extends BaseScreenProps {
  scroll: true;
  contentStyle?: ViewStyle;
  scrollProps?: Omit<ScrollViewProps, 'children' | 'contentContainerStyle'>;
  keyboardAvoiding?: boolean;
  responsive?: boolean;
}

type ScreenProps = StaticScreenProps | ScrollScreenProps;

export function Screen({
  children,
  style,
  backgroundColor,
  responsive = true,
  ...rest
}: ScreenProps) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'components_layout_Screen_tsx_Screen_styles');
  const bg = { backgroundColor: backgroundColor ?? c.background };
  const body = responsive ? <ResponsiveContent centered>{children}</ResponsiveContent> : children;

  if ('scroll' in rest && rest.scroll) {
    const { contentStyle, scrollProps, keyboardAvoiding = true } = rest as ScrollScreenProps;

    if (keyboardAvoiding) {
      return (
        <View style={[styles.flex, bg, style]}>
          <KeyboardScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, contentStyle]}
            {...scrollProps}
          >
            {body}
          </KeyboardScrollView>
        </View>
      );
    }

    return (
      <View style={[styles.flex, bg, style]}>
        <KeyboardScrollView
          enabled={false}
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          {...scrollProps}
        >
          {body}
        </KeyboardScrollView>
      </View>
    );
  }

  const { contentStyle, keyboardAvoiding = false } = rest as StaticScreenProps;

  const content = (
    <View style={[styles.flex, styles.staticContent, contentStyle]}>{body}</View>
  );

  return (
    <View style={[styles.flex, bg, style]}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  flex: {
    minWidth: 0,
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
    gap: spacing[3],
  },
  staticContent: {
    minWidth: 0,
    flex: 1,
    paddingHorizontal: spacing[4],
  },
};
}

import React, { type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useLayoutMetrics } from '@/theme/use-layout-metrics';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Centrer horizontalement avec maxWidth breakpoint. */
  centered?: boolean;
};

/** Conteneur responsive — limite la largeur de lecture sur grands écrans. */
export function ResponsiveContent({ children, style, centered = true }: Props) {
  const layout = useLayoutMetrics();
  return (
    <View
      style={[
        centered && {
          width: '100%' as const,
          maxWidth: layout.contentMaxWidth,
          alignSelf: 'center' as const,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

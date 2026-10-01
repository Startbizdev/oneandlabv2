import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useStyles, type Theme } from '@/theme';

interface Props {
  children: React.ReactNode;
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Colonne scroll + barre d'action basse.
 * Le wrapper `body` (flex:1, minHeight:0) évite le clip tab navigator.
 */
export function ScreenActionLayout({ children, footer, style }: Props) {
  const styles = useStyles(buildStyles);

  return (
    <View style={[styles.root, style]}>
      <View style={styles.body}>{children}</View>
      {footer ?? null}
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
  root: {
    minWidth: 0,
    flex: 1,
    minHeight: 0,
  },
  body: {
    minWidth: 0,
    flex: 1,
    minHeight: 0,
  },
};
}

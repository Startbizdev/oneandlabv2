import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

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
  return (
    <View style={[styles.root, style]}>
      <View style={styles.body}>{children}</View>
      {footer ?? null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
});

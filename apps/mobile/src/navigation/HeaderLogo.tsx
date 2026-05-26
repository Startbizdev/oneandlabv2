import { Image, StyleSheet, View } from 'react-native';
const LOGO = require('../../assets/logo-cary.png');

const LOGO_SIZES = {
  default: { width: 88, height: 28 },
  /** Onglet Rendez-vous infirmier */
  lg: { width: 112, height: 36 },
} as const;

interface Props {
  size?: keyof typeof LOGO_SIZES;
}

export function HeaderLogo({ size = 'default' }: Props) {
  const dims = LOGO_SIZES[size];
  return (
    <View style={styles.wrap}>
      <Image
        source={LOGO}
        style={[styles.logo, dims]}
        resizeMode="contain"
        accessibilityLabel="Cary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    justifyContent: 'center',
  },
  logo: {},
});

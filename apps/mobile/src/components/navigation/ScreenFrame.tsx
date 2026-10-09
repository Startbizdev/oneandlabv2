import { createContext, useContext, useState, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ScreenHeader, type ScreenHeaderVariant } from '@/components/navigation/ScreenHeader';
import { useStyles, type Theme } from '@/theme';

type Props = {
  variant: ScreenHeaderVariant;
  title?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
};

const ScreenHeaderHeightContext = createContext(0);

/**
 * Corps d'écran qui remonte au-dessus du clavier, décalé de la hauteur du header.
 * Version keyboard-controller : sur Android, celle de React Native (`height`) garde un vide sous le contenu après fermeture du clavier.
 */
export function ScreenKeyboardAvoidingView({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const headerHeight = useContext(ScreenHeaderHeightContext);
  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={headerHeight} style={style}>
      {children}
    </KeyboardAvoidingView>
  );
}

/** Écran = header dans le flux + corps qui occupe le reste (au-dessus de la tab bar le cas échéant). */
export function ScreenFrame({ variant, title, left, right, children }: Props) {
  const styles = useStyles(buildStyles);
  const [headerHeight, setHeaderHeight] = useState(0);

  return (
    <View style={styles.root}>
      <ScreenHeader variant={variant} title={title} left={left} right={right} />
      <View style={styles.body} onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.y)}>
        <ScreenHeaderHeightContext.Provider value={headerHeight}>
          {children}
        </ScreenHeaderHeightContext.Provider>
      </View>
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    root: {
      flex: 1,
      minWidth: 0,
      backgroundColor: c.background,
    },
    body: {
      flex: 1,
      minWidth: 0,
    },
  };
}

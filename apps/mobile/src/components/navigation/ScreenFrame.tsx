import { createContext, useContext, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, View, type KeyboardAvoidingViewProps } from 'react-native';
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

/** `KeyboardAvoidingView` du corps d'écran : décalé de la hauteur du header au-dessus de lui. */
export function ScreenKeyboardAvoidingView(props: Omit<KeyboardAvoidingViewProps, 'keyboardVerticalOffset'>) {
  const headerHeight = useContext(ScreenHeaderHeightContext);
  return <KeyboardAvoidingView {...props} keyboardVerticalOffset={headerHeight} />;
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

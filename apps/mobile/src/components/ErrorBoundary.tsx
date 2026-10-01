import React, { Component, useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { AppText, font, spacing, useStyles, type Theme } from '@/theme';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const styles = useStyles(buildStyles);
  // Le splash n'est masqué qu'après lecture de la session : une erreur avant ce moment le laisserait affiché.
  useEffect(() => {
    SplashScreen.hide();
  }, []);
  return (
    <View style={styles.root}>
      <AppText style={styles.title}>Une erreur est survenue</AppText>
      <AppText style={styles.body}>
        Redémarrez l&apos;application. Si le problème persiste, contactez le support.
      </AppText>
      <View style={styles.action}>
        <Button title="Réessayer" size="lg" fullWidth onPress={onRetry} />
      </View>
    </View>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    root: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing[6],
      backgroundColor: c.background,
    },
    title: {
      ...font.headingSemiBold,
      fontSize: fontSize.lg,
      color: c.textPrimary,
      textAlign: 'center',
    },
    body: {
      marginTop: spacing[2],
      fontSize: fontSize.sm,
      color: c.textSecondary,
      textAlign: 'center',
    },
    action: {
      marginTop: spacing[6],
      width: '100%',
      maxWidth: 320,
    },
  } as const;
}

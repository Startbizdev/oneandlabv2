import React, { Component, type ReactNode } from 'react';
import { View } from 'react-native';
import { AppText, font, useStyles, type Theme } from '@/theme';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const styles = useStyles(buildStyles);
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

function buildStyles({ colors: c, fontSize, space }: Theme) {
  return {
    root: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space.xl,
      backgroundColor: c.background,
    },
    title: {
      ...font.headingSemiBold,
      fontSize: fontSize.lg,
      color: c.textPrimary,
      textAlign: 'center',
    },
    body: {
      marginTop: space.sm,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      textAlign: 'center',
    },
    action: {
      marginTop: space.xl,
      width: '100%',
      maxWidth: 320,
    },
  } as const;
}

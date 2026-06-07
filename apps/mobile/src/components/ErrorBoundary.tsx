import React, { Component, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center p-6 bg-white">
          <Text className="text-lg font-semibold text-gray-900">Une erreur est survenue</Text>
          <Text className="mt-2 text-sm text-gray-500 text-center">
            Redémarrez l&apos;application. Si le problème persiste, contactez le support.
          </Text>
          <View className="mt-6 w-full max-w-xs">
            <Button title="Réessayer" size="lg" fullWidth onPress={() => this.setState({ hasError: false })} />
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

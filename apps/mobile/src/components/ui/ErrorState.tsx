import React from 'react';
import { CloudOff } from 'lucide-react-native';
import { getErrorMessage } from '@/lib/errors/handle-api-error';
import { EmptyState } from './EmptyState';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

/** Échec de chargement : message lisible + « Réessayer » (jamais un état vide trompeur). */
export function ErrorState({ error, onRetry, title = 'Chargement impossible' }: ErrorStateProps) {
  return (
    <EmptyState
      Icon={CloudOff}
      title={title}
      description={getErrorMessage(error, 'Vérifiez votre connexion puis réessayez.')}
      actionLabel={onRetry ? 'Réessayer' : undefined}
      onAction={onRetry}
    />
  );
}

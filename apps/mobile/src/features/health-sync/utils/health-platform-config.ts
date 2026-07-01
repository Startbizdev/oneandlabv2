import { Platform } from 'react-native';

export interface HealthPlatformUiConfig {
  name: string;
  connectTitle: string;
  connectedSubtitle: string;
  disconnectedSubtitle: string;
  iconBg: string;
  iconColor: string;
}

export function getHealthPlatformUiConfig(): HealthPlatformUiConfig {
  if (Platform.OS === 'ios') {
    return {
      name: 'Apple Santé',
      connectTitle: 'Connecter Apple Santé',
      connectedSubtitle: 'Poids, activité et fréquence cardiaque',
      disconnectedSubtitle: 'Autorisez Cary à lire vos données Santé',
      iconBg: '#FF2D55',
      iconColor: '#FFFFFF',
    };
  }

  return {
    name: 'Health Connect',
    connectTitle: 'Connecter Health Connect',
    connectedSubtitle: 'Poids, activité et fréquence cardiaque',
    disconnectedSubtitle: 'Autorisez Cary via Health Connect',
    iconBg: '#1B7F5E',
    iconColor: '#FFFFFF',
  };
}

export function formatHealthSyncRelative(iso?: string | null): string {
  if (!iso) return 'Pas encore synchronisé';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Pas encore synchronisé';
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'À l’instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Hier';
  return `Il y a ${days} j`;
}

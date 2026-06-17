import { RefreshControl, type RefreshControlProps } from 'react-native';
import { useAppColors } from '@/theme/use-app-colors';

type Props = Pick<RefreshControlProps, 'refreshing' | 'onRefresh' | 'progressViewOffset'>;

/** RefreshControl unifié — couleur Cary + offset sous header glass (Android). */
export function AppRefreshControl({ refreshing, onRefresh, progressViewOffset = 0 }: Props) {
  const c = useAppColors();

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={c.primary}
      colors={[c.primary]}
      progressBackgroundColor={c.surface}
      progressViewOffset={progressViewOffset}
    />
  );
}

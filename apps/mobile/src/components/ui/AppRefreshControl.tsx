import { RefreshControl, type RefreshControlProps } from 'react-native';
import { useAppColors } from '@/theme/use-app-colors';

/**
 * Sur Android, `ScrollView` clone son `refreshControl` en lui passant `style` et la vue scrollable
 * en `children` : les deux doivent être transmis, sinon tout le contenu disparaît.
 */
type Props = Pick<RefreshControlProps, 'refreshing' | 'onRefresh' | 'progressViewOffset' | 'style' | 'children'>;

/** RefreshControl unifié — couleur Cary + offset sous header glass (Android). */
export function AppRefreshControl({ refreshing, onRefresh, progressViewOffset = 0, style, children }: Props) {
  const c = useAppColors();

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={c.primary}
      colors={[c.primary]}
      progressBackgroundColor={c.surface}
      progressViewOffset={progressViewOffset}
      style={style}
    >
      {children}
    </RefreshControl>
  );
}

import { useThemedStyles } from '@/theme/use-themed-styles';
import { Text, View } from 'react-native';
import { elevation } from '@/theme';
import { MoreMenuItem, buildMoreMenuStyles, type MoreMenuItemProps } from './MoreMenuItem';

interface MoreMenuSectionProps {
  title?: string;
  items: MoreMenuItemProps[];
}

/** Carte menu groupée — même rendu que l’onglet Plus (RoleMoreTabScreen). */
export function MoreMenuSection({ title, items }: MoreMenuSectionProps) {
  const styles = useThemedStyles(buildMoreMenuStyles, 'MoreMenuSection');
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={[styles.sectionCard, elevation.xs]}>
        {items.map((item, index) => (
          <View key={item.label}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <MoreMenuItem {...item} />
          </View>
        ))}
      </View>
    </View>
  );
}

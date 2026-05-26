import { Text, View } from 'react-native';
import { elevation } from '@/theme';
import { MoreMenuItem, moreMenuStyles, type MoreMenuItemProps } from './MoreMenuItem';

interface MoreMenuSectionProps {
  title?: string;
  items: MoreMenuItemProps[];
}

/** Carte menu groupée — même rendu que l’onglet Plus (RoleMoreTabScreen). */
export function MoreMenuSection({ title, items }: MoreMenuSectionProps) {
  return (
    <View style={moreMenuStyles.section}>
      {title ? <Text style={moreMenuStyles.sectionTitle}>{title}</Text> : null}
      <View style={[moreMenuStyles.sectionCard, elevation.xs]}>
        {items.map((item, index) => (
          <View key={item.label}>
            {index > 0 ? <View style={moreMenuStyles.divider} /> : null}
            <MoreMenuItem {...item} />
          </View>
        ))}
      </View>
    </View>
  );
}

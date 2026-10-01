import { View } from 'react-native';
import { elevation, AppText, useStyles } from '@/theme';
import { SettingsRow, buildSettingsStyles, type SettingsRowProps } from './SettingsRow';

interface SettingsSectionProps {
  title?: string;
  items: SettingsRowProps[];
}

/** Carte de lignes groupées (onglet Plus, Compte, Paramètres). */
export function SettingsSection({ title, items }: SettingsSectionProps) {
  const styles = useStyles(buildSettingsStyles);
  return (
    <View style={styles.section}>
      {title ? (
        <AppText style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </AppText>
      ) : null}
      <View style={[styles.sectionCard, elevation.xs]}>
        {items.map((item, index) => (
          <View key={item.label}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <SettingsRow {...item} />
          </View>
        ))}
      </View>
    </View>
  );
}

import { View } from 'react-native';
import { buildSettingsStyles } from '@/components/ui/SettingsRow';
import { spacing, AppText, useStyles } from '@/theme';

interface Props {
  title: string;
  items: string[];
}

/** Liste courte de conséquences affichée avant une suppression de compte. */
export function DeleteAccountInfoCard({ title, items }: Props) {
  const settings = useStyles(buildSettingsStyles);
  const styles = useStyles(buildStyles);
  return (
    <View style={settings.section}>
      <AppText style={settings.sectionTitle} accessibilityRole="header">
        {title}
      </AppText>
      <View style={[settings.sectionCard, styles.body]}>
        {items.map((item) => (
          <View key={item} style={styles.item}>
            <AppText variant="secondary">•</AppText>
            <AppText variant="secondary" style={styles.text}>
              {item}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

function buildStyles() {
  return {
    body: {
      padding: spacing[4],
      gap: spacing[2],
    },
    item: {
      flexDirection: 'row' as const,
      gap: spacing[2],
    },
    text: {
      flex: 1,
      minWidth: 0,
    },
  };
}

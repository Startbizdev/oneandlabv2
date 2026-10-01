import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { AppText, spacing, useStyles } from '@/theme';
import { SettingsRow, buildSettingsStyles, type SettingsRowProps } from './SettingsRow';

interface SettingsSectionProps {
  title?: string;
  items?: SettingsRowProps[];
  /** Lignes libres (ex. `SettingsRow` conditionnelles, ligne statique), après `items`. */
  children?: ReactNode;
  /** Lignes sans icône : séparateurs alignés sur le bord du texte. */
  iconless?: boolean;
}

/** Groupe de lignes dans une carte (onglet Plus, Compte, Paramètres) — aussi pour une action isolée. */
export function SettingsSection({ title, items = [], children, iconless = false }: SettingsSectionProps) {
  const styles = useStyles(buildSettingsStyles);
  const local = useStyles(buildStyles);
  const rows = [
    ...items.map((item) => <SettingsRow key={item.label} {...item} />),
    ...Children.toArray(children),
  ];

  return (
    <View style={styles.section}>
      {title ? (
        <AppText style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </AppText>
      ) : null}
      <View style={styles.sectionCard}>
        {rows.map((row, index) => (
          <Fragment key={isValidElement(row) && row.key != null ? row.key : index}>
            {index > 0 ? <View style={[styles.divider, iconless && local.dividerIconless]} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

function buildStyles() {
  return {
    dividerIconless: {
      marginLeft: spacing[4],
    },
  };
}

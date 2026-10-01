import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { buildSettingsStyles } from '@/components/ui/SettingsRow';
import { ICON_STROKE_WIDTH, iconSize, spacing, AppText, useAppColors, useStyles } from '@/theme';

interface Props extends ViewProps {
  title: string;
  /** Une phrase d'aide au plus. */
  description?: string;
  Icon?: LucideIcon;
  children: ReactNode;
}

/** Groupe de champs : titre de section au-dessus d'une carte, comme les listes de réglages. */
export function ProfileSection({ title, description, Icon, children, style, ...rest }: Props) {
  const c = useAppColors();
  const settings = useStyles(buildSettingsStyles);
  const styles = useStyles(buildStyles);

  return (
    <View style={[settings.section, style]} {...rest}>
      <Row gap={spacing[1.5]} align="center" style={styles.header}>
        {Icon ? <Icon size={iconSize.sm} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} /> : null}
        <AppText style={[settings.sectionTitle, styles.title]} accessibilityRole="header">
          {title}
        </AppText>
      </Row>
      <View style={[settings.sectionCard, styles.body]}>
        {description ? <AppText variant="caption">{description}</AppText> : null}
        {children}
      </View>
    </View>
  );
}

function buildStyles() {
  return {
    header: { paddingHorizontal: spacing[1] },
    title: { flexShrink: 1, paddingHorizontal: 0 },
    body: {
      padding: spacing[4],
      gap: spacing[3],
    },
  };
}

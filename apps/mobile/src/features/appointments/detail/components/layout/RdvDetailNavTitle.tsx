import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { StyleSheet, Text, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { RdvDetailHeaderStatus } from './RdvDetailHeaderStatus';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

/** Titre + badge sur une ligne avec le bouton retour (slot titre du header). */
export function RdvDetailNavTitle({
  title,
  status,
}: {
  title: string;
  status?: string;
}) {
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_layout_RdvDetailNavTitle_tsx_RdvDetailNavTitle_styles');

  return (
    <Row gap={spacing[2]} align="center" flex={1} style={styles.row}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {status ? (
        <View style={styles.badgeWrap}>
          <RdvDetailHeaderStatus status={status} />
        </View>
      ) : null}
    </Row>
  );
}

function buildStyles(c: AppColors) {
  return {
  row: {
    minWidth: 0,
  },
  title: {
    flexShrink: 1,
    minWidth: 0,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: c.textPrimary,
  },
  badgeWrap: {
    flexShrink: 0,
  },
};
}

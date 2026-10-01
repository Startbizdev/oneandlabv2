import { StyleSheet, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { RdvDetailHeaderStatus } from './RdvDetailHeaderStatus';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';

/** Titre + badge sur une ligne avec le bouton retour (slot titre du header). */
export function RdvDetailNavTitle({
  title,
  status,
}: {
  title: string;
  status?: string;
}) {
  const styles = useStyles(buildStyles);

  return (
    <Row gap={spacing[2]} align="center" flex={1} style={styles.row}>
      <AppText style={styles.title} numberOfLines={1}>
        {title}
      </AppText>
      {status ? (
        <View style={styles.badgeWrap}>
          <RdvDetailHeaderStatus status={status} />
        </View>
      ) : null}
    </Row>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  row: {
    minWidth: 0,
  },
  title: {
    flexShrink: 1,
    minWidth: 0,
    ...font.heading,
    fontSize: fontSize.lg,
    color: c.textPrimary,
  },
  badgeWrap: {
    flexShrink: 0,
  },
};
}

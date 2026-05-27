import { StyleSheet, Text, View } from 'react-native';
import { RdvDetailHeaderStatus } from './RdvDetailHeaderStatus';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

/** Titre + badge sur une ligne avec le bouton retour (slot titre du header). */
export function RdvDetailNavTitle({
  title,
  status,
}: {
  title: string;
  status?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {status ? (
        <View style={styles.badgeWrap}>
          <RdvDetailHeaderStatus status={status} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    minWidth: 0,
    flex: 1,
  },
  title: {
    flexShrink: 1,
    minWidth: 0,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
  badgeWrap: {
    flexShrink: 0,
  },
});

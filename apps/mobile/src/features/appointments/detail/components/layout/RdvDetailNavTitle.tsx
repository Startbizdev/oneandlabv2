import { StyleSheet, Text, View } from 'react-native';
import { RdvDetailHeaderStatus } from './RdvDetailHeaderStatus';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

/** Titre + badge dans `headerTitle` — largeur intrinsèque (pas de flex:1 sur le titre). */
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
      {status ? <RdvDetailHeaderStatus status={status} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    maxWidth: '100%',
  },
  title: {
    flexShrink: 1,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    minWidth: 0,
  },
});

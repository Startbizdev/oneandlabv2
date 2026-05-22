import { StyleSheet, Text, View } from 'react-native';
import { RdvDetailHeaderStatus } from './RdvDetailHeaderStatus';
import { colors } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

/** Titre + statut dans la barre native (évite le fond blanc iOS de `headerRight`). */
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minWidth: 0,
  },
  title: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    minWidth: 0,
  },
});

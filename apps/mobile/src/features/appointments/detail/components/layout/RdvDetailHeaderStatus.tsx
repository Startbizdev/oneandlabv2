import { StyleSheet, View } from 'react-native';
import { StatusBadge } from '@/components/ui/Badge';
import { spacing } from '@/theme';

/** Même badge que les cartes liste RDV, avec marge à droite dans le header. */
export function RdvDetailHeaderStatus({ status }: { status: string }) {
  return (
    <View style={styles.wrap}>
      <StatusBadge status={status} size="sm" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginRight: spacing[3],
  },
});

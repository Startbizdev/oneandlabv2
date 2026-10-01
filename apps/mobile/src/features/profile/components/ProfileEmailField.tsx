import { View } from 'react-native';
import { buildFieldStyles, FIELD_MIN_HEIGHT } from '@/components/ui/field-styles';
import { spacing, AppText, useStyles, type Theme } from '@/theme';

interface Props {
  email?: string | null;
}

/** E-mail du compte en lecture seule (non modifiable depuis l'application). */
export function ProfileEmailField({ email }: Props) {
  const field = useStyles(buildFieldStyles);
  const styles = useStyles(buildStyles);

  return (
    <View style={field.wrapper}>
      <AppText style={field.label}>E-mail</AppText>
      <View style={[field.container, styles.value]}>
        <AppText variant="secondary" selectable>
          {email || '—'}
        </AppText>
      </View>
      <AppText style={field.hint}>Non modifiable depuis l’application.</AppText>
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    value: {
      minHeight: FIELD_MIN_HEIGHT,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      backgroundColor: c.surfaceAlt,
      borderColor: c.borderLight,
    },
  };
}

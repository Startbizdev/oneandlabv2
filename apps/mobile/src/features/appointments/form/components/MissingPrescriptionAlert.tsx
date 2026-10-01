import { View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { AlertTriangle } from 'lucide-react-native';
import { missingPrescriptionCopy } from '../constants/appointment-document-fields';
import {
  ICON_STROKE_WIDTH,
  radius,
  spacing,
  iconSize,
  AppText,
  useAppColors,
  useStyles,
  type Theme,
} from '@/theme';

interface Props {
  serviceType?: string;
  visible: boolean;
}

export function MissingPrescriptionAlert({ serviceType, visible }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  if (!visible) return null;

  const { title, description } = missingPrescriptionCopy(serviceType);

  return (
    <Cluster
      align="start"
      gap={spacing[3]}
      style={styles.box}
      leading={<AlertTriangle size={iconSize.md} color={c.warning} strokeWidth={ICON_STROKE_WIDTH} />}
    >
      <View style={styles.body}>
        <AppText variant="headline">{title}</AppText>
        <AppText variant="secondary">{description}</AppText>
      </View>
    </Cluster>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    box: {
      padding: spacing[3],
      borderRadius: radius.lg,
      backgroundColor: c.warningLight,
    },
    body: { minWidth: 0, flex: 1, gap: spacing[1] },
  };
}

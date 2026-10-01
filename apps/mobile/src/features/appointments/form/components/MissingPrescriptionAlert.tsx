import { useAppColors } from '@/theme/use-app-colors';

import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { AlertTriangle } from 'lucide-react-native';
import { missingPrescriptionCopy } from '../constants/appointment-document-fields';
import { radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

interface Props {
  serviceType?: string;
  visible: boolean;
}

export function MissingPrescriptionAlert({
  serviceType, visible }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const [open, setOpen] = useState(false);
  if (!visible) return null;

  const { title, description } = missingPrescriptionCopy(serviceType);

  return (
    <Cluster
      align="start"
      gap={spacing[2.5]}
      style={styles.box}
      leading={<AlertTriangle size={iconSize.mdSm} color={c.warning} strokeWidth={2.25} />}
    >
      <View style={styles.body}>
        <AppText style={styles.title}>{title}</AppText>
        <Pressable onPress={() => setOpen((v) => !v)} hitSlop={8}>
          <AppText style={styles.more}>{open ? 'Masquer' : 'Plus d’info'}</AppText>
        </Pressable>
        {open ? <AppText style={styles.desc}>{description}</AppText> : null}
      </View>
    </Cluster>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  box: {
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.warningMid,
    backgroundColor: c.warningLight,
  },
  body: { minWidth: 0, flex: 1, gap: spacing[1] },
  title: {
    ...font.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  more: {
    ...font.semiBold,
    fontSize: fontSize.xs,
    color: c.warning,
  },
  desc: {
    ...font.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    lineHeight: fontSize.xs * 1.45,
  },
};
}


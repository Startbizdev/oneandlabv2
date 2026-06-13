import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { AlertTriangle } from 'lucide-react-native';
import { missingPrescriptionCopy } from '../constants/appointment-document-fields';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  serviceType?: string;
  visible: boolean;
}

export function MissingPrescriptionAlert({
  serviceType, visible }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_form_components_MissingPrescriptionAlert_tsx_styles');
  const [open, setOpen] = useState(false);
  if (!visible) return null;

  const { title, description } = missingPrescriptionCopy(serviceType);

  return (
    <Cluster
      align="start"
      gap={spacing[2.5]}
      style={styles.box}
      leading={<AlertTriangle size={18} color={c.warning} strokeWidth={2.25} />}
    >
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Pressable onPress={() => setOpen((v) => !v)} hitSlop={8}>
          <Text style={styles.more}>{open ? 'Masquer' : 'Plus d’info'}</Text>
        </Pressable>
        {open ? <Text style={styles.desc}>{description}</Text> : null}
      </View>
    </Cluster>
  );
}

function buildStyles(c: AppColors) {
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
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  more: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.warning,
  },
  desc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    lineHeight: fontSize.xs * 1.45,
  },
};
}


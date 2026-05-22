import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { missingPrescriptionCopy } from '../constants/appointment-document-fields';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  serviceType?: string;
  visible: boolean;
}

export function MissingPrescriptionAlert({ serviceType, visible }: Props) {
  const [open, setOpen] = useState(false);
  if (!visible) return null;

  const { title, description } = missingPrescriptionCopy(serviceType);

  return (
    <View style={styles.box}>
      <AlertTriangle size={18} color={colors.warning} strokeWidth={2.25} />
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Pressable onPress={() => setOpen((v) => !v)} hitSlop={8}>
          <Text style={styles.more}>{open ? 'Masquer' : 'Plus d’info'}</Text>
        </Pressable>
        {open ? <Text style={styles.desc}>{description}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2.5],
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warningMid,
    backgroundColor: colors.warningLight,
  },
  body: { flex: 1, gap: spacing[1] },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  more: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.warning,
  },
  desc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.45,
  },
});

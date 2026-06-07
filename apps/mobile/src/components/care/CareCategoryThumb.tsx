import { colors } from '@/theme';
import { Image, StyleSheet, View } from 'react-native';
import { Droplet, Stethoscope } from 'lucide-react-native';
import { isBloodTestAppointment } from '@oneandlab/shared-utils';
import { resolveCareCategoryImageSrc } from '@/utils/care-category-image';
import { radius } from '@/theme';

interface Props {
  imageUrl?: string | null;
  appointmentType?: string | null;
  size?: number;
}

export function CareCategoryThumb({ imageUrl, appointmentType, size = 28 }: Props) {
  const src = resolveCareCategoryImageSrc(imageUrl);
  const box = { width: size, height: size, borderRadius: radius.md };

  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={[box, styles.img]}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    );
  }

  const Icon = isBloodTestAppointment(appointmentType) ? Droplet : Stethoscope;
  return (
    <View style={[box, styles.fallback]}>
      <Icon size={size * 0.48} color={colors.textSecondary} strokeWidth={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  img: {
    backgroundColor: colors.surfaceAlt,
  },
  fallback: {
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
});

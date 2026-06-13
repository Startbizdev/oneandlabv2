import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
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
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'components_care_CareCategoryThumb_tsx_CareCategoryThumb_styles');

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
      <Icon size={size * 0.48} color={c.textSecondary} strokeWidth={2} />
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  img: {
    backgroundColor: c.surfaceAlt,
  },
  fallback: {
    backgroundColor: c.surfaceAlt,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderLight,
  },
};
}

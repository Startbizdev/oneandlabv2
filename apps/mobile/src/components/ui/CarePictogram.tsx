import { useState } from 'react';
import { Image } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { careArtworkKey, careSymbol, explicitCareIcon, resolveCareCategoryIcon } from '@oneandlab/shared-utils';
import { useAppColors } from '@/theme/use-app-colors';
import { resolveCareCategoryImageSrc } from '@/utils/care-category-image';
import { CARE_ARTWORK_IMAGES } from '@/constants/care-artwork-images';
import catalogueIcons from '@/assets/care-icons.json';

const icons: Record<string, string> = catalogueIcons;

/** Uploaded image, then the admin-chosen icon, then the bundled 3D artwork (works offline). */
export function CarePictogram({ label, type, icon, imageUrl, size = 16, color }: {
  label: string; type?: string | null; icon?: string | null; imageUrl?: string | null; size?: number; color?: string;
}) {
  const c = useAppColors();
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const explicitIcon = explicitCareIcon(icon);
  const src = explicitIcon ? null : resolveCareCategoryImageSrc(imageUrl);
  if (src && failedImage !== src) {
    return <Image source={{ uri: src }} style={{ width: size, height: size }} resizeMode="contain"
      onError={() => setFailedImage(src)} accessible={false} />;
  }
  if (!explicitIcon) {
    return <Image source={CARE_ARTWORK_IMAGES[careArtworkKey({ name: label, type })]}
      style={{ width: size, height: size }} resizeMode="contain" accessible={false} />;
  }
  const name = resolveCareCategoryIcon({ name: label, type, icon });
  const xml = icons[name] ?? icons[`lucide:${careSymbol({ name: label, type })}`];
  return <SvgXml xml={xml} width={size} height={size} color={color ?? c.textSecondary}
    accessibilityElementsHidden importantForAccessibility="no" />;
}

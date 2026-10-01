import { useState } from 'react';
import { Image, View } from 'react-native';
import { careArtworkKey } from '@oneandlab/shared-utils';
import { buildSettingsStyles } from '@/components/ui/SettingsRow';
import { CARE_ARTWORK_IMAGES } from '@/constants/care-artwork-images';
import { resolveProfileImageUrl } from '@/lib/images/profile-image-url';
import { iconSize, useAppColors, useStyles } from '@/theme';
import type { CareSource } from '../utils/care-source';

interface Props {
  care: CareSource;
  /** `well` : puits neutre des listes (comme `SettingsRow`) ; `inline` : à côté d'un libellé. */
  variant?: 'inline' | 'well';
  /** Taille de l'illustration `inline` ; le puits garde la taille des pictogrammes de liste. */
  size?: number;
}

/**
 * Visuel décoratif d'un soin — le libellé voisin porte le sens. Image importée par l'admin si elle se charge,
 * sinon illustration 3D livrée avec l'app (hors ligne).
 */
export function CareIcon({ care, variant = 'inline', size = iconSize.md }: Props) {
  const c = useAppColors();
  const settings = useStyles(buildSettingsStyles);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const resolvedUri = resolveProfileImageUrl(care.image_url);
  const uploadedUri = resolvedUri && resolvedUri !== failedUri ? resolvedUri : undefined;
  const well = variant === 'well';
  const side = well ? iconSize.xl : size;
  return (
    <View
      style={well ? [settings.iconWell, { backgroundColor: c.surfaceAlt }] : undefined}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={uploadedUri ? { uri: uploadedUri } : CARE_ARTWORK_IMAGES[careArtworkKey(care)]}
        onError={uploadedUri ? () => setFailedUri(uploadedUri) : undefined}
        style={{ width: side, height: side }}
        resizeMode="contain"
        accessible={false}
      />
    </View>
  );
}

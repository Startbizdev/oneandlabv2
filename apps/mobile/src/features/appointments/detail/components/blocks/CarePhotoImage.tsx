import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageResizeMode,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ImageOff, RefreshCw } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { loadCarePhotoLocalUri } from '../../utils/care-photo-image';
import { radius } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  photoId: string;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
  onPress?: () => void;
  accessibilityLabel?: string;
  children?: React.ReactNode;
}

export function CarePhotoImage({
  photoId,
  style,
  imageStyle,
  resizeMode = 'cover',
  onPress,
  accessibilityLabel,
  children,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_blocks_CarePhotoImage_tsx_styles');
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setUri(null);

    void loadCarePhotoLocalUri(photoId, { bustCache: attempt > 0 }).then((local) => {
      if (cancelled) return;
      setUri(local);
      setLoading(false);
      setFailed(!local);
    });

    return () => {
      cancelled = true;
    };
  }, [photoId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const body = (
    <View style={[styles.wrap, style]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={c.primary} />
        </View>
      ) : failed || !uri ? (
        <Pressable style={styles.center} onPress={retry} accessibilityRole="button">
          <ImageOff size={22} color={c.textTertiary} strokeWidth={1.75} />
          <Text style={styles.failText}>Photo indisponible</Text>
          <Row gap={4} align="center" style={styles.retryRow}>
            <RefreshCw size={12} color={c.primary} strokeWidth={2.5} />
            <Text style={styles.retryText}>Réessayer</Text>
          </Row>
        </Pressable>
      ) : (
        <Image source={{ uri }} style={[styles.image, imageStyle]} resizeMode={resizeMode} />
      )}
      {children}
    </View>
  );

  if (onPress && uri && !loading) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? 'Ouvrir la photo'}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        {body}
      </Pressable>
    );
  }

  return body;
}

function buildStyles(c: AppColors) {
  return {
  wrap: {
    overflow: 'hidden' as const,
    backgroundColor: c.surfaceAlt,
  },
  image: {
    width: '100%' as const,
    height: '100%' as const,
  },
  center: {
    minWidth: 0,
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    padding: 8,
  },
  failText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    textAlign: 'center' as const,
  },
  retryRow: {
    marginTop: 2,
  },
  retryText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.primary,
  },
  pressed: { opacity: 0.92 },
};
}


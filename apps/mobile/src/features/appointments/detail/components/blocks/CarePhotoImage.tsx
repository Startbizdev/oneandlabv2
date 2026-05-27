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
import { loadCarePhotoLocalUri } from '../../utils/care-photo-image';
import { colors, radius } from '@/theme';
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
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : failed || !uri ? (
        <Pressable style={styles.center} onPress={retry} accessibilityRole="button">
          <ImageOff size={22} color={colors.textTertiary} strokeWidth={1.75} />
          <Text style={styles.failText}>Photo indisponible</Text>
          <View style={styles.retryRow}>
            <RefreshCw size={12} color={colors.primary} strokeWidth={2.5} />
            <Text style={styles.retryText}>Réessayer</Text>
          </View>
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

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 8,
  },
  failText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
    textAlign: 'center',
  },
  retryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  retryText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.primary,
  },
  pressed: { opacity: 0.92 },
});

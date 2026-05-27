import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { Camera } from 'lucide-react-native';
import { loadCarePhotoLocalUri } from '../../utils/care-photo-image';
import { colors, radius } from '@/theme';

export function CarePhotoThumbnail({ photoId }: { photoId: string }) {
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void loadCarePhotoLocalUri(photoId).then((u) => {
      if (!cancelled) {
        setUri(u);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [photoId]);

  if (loading) {
    return (
      <View style={styles.placeholder}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (uri) {
    return <Image source={{ uri }} style={styles.image} resizeMode="cover" />;
  }

  return (
    <View style={styles.placeholder}>
      <Camera size={28} color={colors.textTertiary} strokeWidth={1.5} />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
    borderRadius: radius.lg,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
});

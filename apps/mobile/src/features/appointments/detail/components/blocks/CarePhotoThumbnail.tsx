import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { getApiBase } from '@/config/env';
import { getAuthToken } from '@/lib/auth-token';
import { Camera } from 'lucide-react-native';
import { colors, radius } from '@/theme';

async function loadPreviewUri(documentId: string): Promise<string | null> {
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) return null;
  const token = getAuthToken();
  const url = `${getApiBase()}/medical-documents/${encodeURIComponent(documentId)}/download`;
  const dest = `${dir}care-thumb-${documentId}.jpg`;
  try {
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists) return dest;
    const result = await FileSystem.downloadAsync(url, dest, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (result.status >= 200 && result.status < 300) return dest;
  } catch {
    /* ignore */
  }
  return null;
}

export function CarePhotoThumbnail({ photoId }: { photoId: string }) {
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void loadPreviewUri(photoId).then((u) => {
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

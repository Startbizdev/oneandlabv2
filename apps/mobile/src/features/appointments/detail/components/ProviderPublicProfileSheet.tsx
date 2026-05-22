import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { SheetModal } from '@/components/ui/SheetModal';
import { webAppUrl } from '@/config/env';
import { providerPublicProfilePath } from '../utils/provider-public-profile';
import { colors } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  providerType: 'nurse' | 'lab';
  slug: string;
  title?: string;
}

export function ProviderPublicProfileSheet({
  visible,
  onClose,
  providerType,
  slug,
  title = 'Profil',
}: Props) {
  const [loading, setLoading] = useState(true);
  const path = providerPublicProfilePath(providerType, slug);
  const uri = useMemo(() => (path ? webAppUrl(path) : ''), [path]);

  if (!path) return null;

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title={title}
      keyboardAware={false}
      disableScroll
    >
      <View style={styles.webWrap}>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : null}
        <WebView
          source={{ uri }}
          style={styles.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  webWrap: {
    height: 520,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});

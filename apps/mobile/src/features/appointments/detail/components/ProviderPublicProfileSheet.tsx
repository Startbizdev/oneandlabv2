import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
  const webScrollGesture = useMemo(() => Gesture.Native(), []);

  if (!path) return null;

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title={title}
      keyboardAware={false}
      disableScroll
      enableSwipeToDismiss={false}
      contentStyle={styles.sheetBody}
    >
      <GestureDetector gesture={webScrollGesture}>
        <View style={styles.webWrap} collapsable={false}>
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
            nestedScrollEnabled
            scrollEnabled
            bounces={Platform.OS === 'ios'}
            showsVerticalScrollIndicator
          />
        </View>
      </GestureDetector>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBody: {
    paddingTop: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
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

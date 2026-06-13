import { useCallback, useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';
import { SIGNATURE_HTML } from '@/features/prescriptions/lib/signature-pad-html';

export type PrescriptionSignaturePadHandle = {
  clear: () => void;
  export: () => void;
  load: (pngBase64: string | null) => void;
};

type Props = {
  onReady?: () => void;
  onExport?: (pngBase64: string | null) => void;
  initialPng?: string | null;
  height?: number;
};

export const PrescriptionSignaturePad = forwardRef<PrescriptionSignaturePadHandle, Props>(
  function PrescriptionSignaturePad({ onReady, onExport, initialPng, height = 180 }, ref) {
    const webRef = useRef<WebView>(null);
    const readyRef = useRef(false);

    const post = useCallback((payload: object) => {
      webRef.current?.postMessage(JSON.stringify(payload));
    }, []);

    useImperativeHandle(ref, () => ({
      clear: () => post({ type: 'clear' }),
      export: () => post({ type: 'export' }),
      load: (pngBase64: string | null) => post({ type: 'load', payload: pngBase64 ?? '' }),
    }));

    useEffect(() => {
      if (readyRef.current && initialPng) {
        post({ type: 'load', payload: initialPng });
      }
    }, [initialPng, post]);

    const onMessage = useCallback(
      (event: WebViewMessageEvent) => {
        try {
          const data = JSON.parse(event.nativeEvent.data) as {
            type?: string;
            payload?: string;
          };
          if (data.type === 'ready') {
            readyRef.current = true;
            if (initialPng) {
              post({ type: 'load', payload: initialPng });
            }
            onReady?.();
            return;
          }
          if (data.type === 'png') {
            const raw = data.payload ?? '';
            const idx = raw.indexOf(',');
            onExport?.(idx >= 0 ? raw.slice(idx + 1) : raw);
            return;
          }
          if (data.type === 'empty') {
            onExport?.(null);
          }
        } catch {
          /* ignore */
        }
      },
      [initialPng, onExport, onReady, post],
    );

    return (
      <View style={[styles.wrap, { height }]}>
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html: SIGNATURE_HTML }}
          onMessage={onMessage}
          scrollEnabled={false}
          bounces={false}
          style={styles.web}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
  },
  web: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

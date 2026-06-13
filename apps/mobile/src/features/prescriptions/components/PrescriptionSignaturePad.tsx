import { useCallback, useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';
import {
  SIGNATURE_HTML,
  normalizeSignaturePngBase64,
} from '@/features/prescriptions/lib/signature-pad-html';

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
    const layoutReadyRef = useRef(false);
    const initialPngRef = useRef(normalizeSignaturePngBase64(initialPng));

    useEffect(() => {
      initialPngRef.current = normalizeSignaturePngBase64(initialPng);
    }, [initialPng]);

    const post = useCallback((payload: object) => {
      webRef.current?.postMessage(JSON.stringify(payload));
    }, []);

    const loadIntoPad = useCallback(
      (pngBase64: string | null) => {
        post({ type: 'load', payload: pngBase64 ?? '' });
      },
      [post],
    );

    const tryLoadInitial = useCallback(() => {
      if (!readyRef.current || !layoutReadyRef.current) return;
      const png = initialPngRef.current;
      if (png) loadIntoPad(png);
    }, [loadIntoPad]);

    useImperativeHandle(ref, () => ({
      clear: () => post({ type: 'clear' }),
      export: () => post({ type: 'export' }),
      load: (pngBase64: string | null) => loadIntoPad(normalizeSignaturePngBase64(pngBase64)),
    }));

    useEffect(() => {
      tryLoadInitial();
    }, [initialPng, tryLoadInitial]);

    const onLayout = useCallback(
      (_event: LayoutChangeEvent) => {
        layoutReadyRef.current = true;
        tryLoadInitial();
      },
      [tryLoadInitial],
    );

    const onMessage = useCallback(
      (event: WebViewMessageEvent) => {
        try {
          const data = JSON.parse(event.nativeEvent.data) as {
            type?: string;
            payload?: string;
          };
          if (data.type === 'ready') {
            readyRef.current = true;
            tryLoadInitial();
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
      [onExport, onReady, tryLoadInitial],
    );

    return (
      <View style={[styles.wrap, { height }]} onLayout={onLayout}>
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html: SIGNATURE_HTML }}
          onMessage={onMessage}
          onLoadEnd={tryLoadInitial}
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

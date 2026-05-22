import React, { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  title: string;
  message?: string;
  type: ToastType;
}

interface ToastContextValue {
  show: (title: string, opts?: { message?: string; type?: ToastType }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const typeConfig: Record<ToastType, { bg: string; accent: string; icon: string }> = {
  success: { bg: '#0D1B2A', accent: colors.success, icon: '✓' },
  error: { bg: '#0D1B2A', accent: colors.error, icon: '✕' },
  info: { bg: '#0D1B2A', accent: colors.primary, icon: 'ℹ' },
  warning: { bg: '#0D1B2A', accent: colors.warning, icon: '!' },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const config = typeConfig[toast.type];
  return (
    <Animated.View
      entering={FadeInDown.springify().damping(22).stiffness(320)}
    >
      <Pressable onPress={onDismiss} style={[styles.toast, { backgroundColor: config.bg }, elevation.lg]}>
        <View style={[styles.accentBar, { backgroundColor: config.accent }]} />
        <View style={styles.toastContent}>
          <Animated.Text style={styles.toastTitle}>{toast.title}</Animated.Text>
          {toast.message ? (
            <Animated.Text style={styles.toastMessage}>{toast.message}</Animated.Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { top } = useSafeAreaInsets();

  const show = useCallback((title: string, opts?: { message?: string; type?: ToastType }) => {
    const id = Date.now();
    const type = opts?.type ?? 'info';

    Haptics.notificationAsync(
      type === 'success'
        ? Haptics.NotificationFeedbackType.Success
        : type === 'error'
          ? Haptics.NotificationFeedbackType.Error
          : Haptics.NotificationFeedbackType.Warning,
    );

    setToasts((prev) => [...prev, { id, title, message: opts?.message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3800);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <View style={[styles.container, { top: top + 12 }]} pointerEvents="box-none">
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            toast={t}
            onDismiss={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast requires ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    gap: spacing[2],
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.xl,
    overflow: 'hidden',
    minHeight: 52,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  toastContent: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: 2,
  },
  toastTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textInverse,
    letterSpacing: 0.1,
  },
  toastMessage: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.65)',
  },
});

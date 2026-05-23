import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import {
  AlertTriangle,
  CircleCheck,
  CircleX,
  Info,
  type LucideIcon,
} from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type ToastType = 'success' | 'error' | 'info' | 'warning';

type ToastState = {
  id: number;
  line: string;
  type: ToastType;
};

type ShowOpts = { message?: string; type?: ToastType };

interface ToastContextValue {
  show: (title: string, opts?: ShowOpts) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION_MS = 3200;
const MAX_LINE_LEN = 72;

const TYPE_META: Record<ToastType, { Icon: LucideIcon; iconColor: string; accent: string }> = {
  success: { Icon: CircleCheck, iconColor: colors.success, accent: colors.success },
  error: { Icon: CircleX, iconColor: colors.error, accent: colors.error },
  info: { Icon: Info, iconColor: colors.primaryDark, accent: colors.primary },
  warning: { Icon: AlertTriangle, iconColor: colors.warning, accent: colors.warning },
};

/** Une seule ligne courte : titre seul, ou message seul si le titre est générique. */
function buildToastLine(title: string, message?: string): string {
  const t = title.trim();
  const m = message?.trim();
  if (!m) return t;
  const genericTitle = /^(erreur|info|attention|succès|success)$/i.test(t);
  const line = genericTitle ? m : `${t} — ${m}`;
  if (line.length <= MAX_LINE_LEN) return line;
  return `${line.slice(0, MAX_LINE_LEN - 1).trim()}…`;
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  const meta = TYPE_META[toast.type];
  const { Icon } = meta;
  const progress = useSharedValue(1);
  const trackWidth = useSharedValue(0);

  useEffect(() => {
    progress.value = 1;
    progress.value = withTiming(0, {
      duration: DURATION_MS,
      easing: Easing.linear,
    });
  }, [progress, toast.id]);

  const progressStyle = useAnimatedStyle(() => ({
    width: trackWidth.value * progress.value,
  }));

  const Shell = Platform.OS === 'ios' ? BlurView : View;
  const shellProps =
    Platform.OS === 'ios'
      ? { intensity: 80, tint: 'light' as const }
      : { style: styles.androidShell };

  return (
    <Animated.View
      entering={FadeInDown.duration(280).springify().damping(20)}
      exiting={FadeOutUp.duration(180)}
      style={styles.toastWrap}
    >
      <Pressable
        onPress={onDismiss}
        accessibilityRole="alert"
        accessibilityLabel={toast.line}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressablePressed]}
      >
        <Shell {...shellProps} style={styles.card}>
          <View style={styles.row}>
            <Icon size={17} color={meta.iconColor} strokeWidth={2.35} />
            <Text style={styles.line} numberOfLines={1} ellipsizeMode="tail">
              {toast.line}
            </Text>
          </View>
          <View
            style={styles.progressTrack}
            onLayout={(e) => {
              trackWidth.value = e.nativeEvent.layout.width;
            }}
          >
            <Animated.View
              style={[styles.progressFill, { backgroundColor: meta.accent }, progressStyle]}
            />
          </View>
        </Shell>
      </Pressable>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { top } = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  const show = useCallback(
    (title: string, opts?: ShowOpts) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      idRef.current += 1;
      setToast({
        id: idRef.current,
        line: buildToastLine(title, opts?.message),
        type: opts?.type ?? 'info',
      });
      timerRef.current = setTimeout(hide, DURATION_MS);
    },
    [hide],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      <View style={styles.root}>
        {children}
        {toast ? (
          <View
            style={[styles.host, { top: top + spacing[2] }]}
            pointerEvents="box-none"
          >
            <ToastCard key={toast.id} toast={toast} onDismiss={hide} />
          </View>
        ) : null}
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
  root: {
    flex: 1,
  },
  host: {
    position: 'absolute',
    left: spacing[5],
    right: spacing[5],
    zIndex: 9999,
    alignItems: 'center',
  },
  toastWrap: {
    width: '100%',
    maxWidth: 360,
  },
  pressable: {
    width: '100%',
    borderRadius: radius.full,
    overflow: 'hidden',
    ...elevation.md,
  },
  pressablePressed: {
    opacity: 0.9,
  },
  card: {
    borderRadius: radius.full,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15, 23, 42, 0.07)',
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.82)' : colors.surface,
  },
  androidShell: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[3.5],
  },
  line: {
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    letterSpacing: -0.15,
  },
  progressTrack: {
    height: 1.5,
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    opacity: 0.45,
  },
});

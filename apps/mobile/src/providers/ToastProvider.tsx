import { Row } from '@/components/layout/primitives';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { FullWindowOverlay } from 'react-native-screens';
import {
  AlertTriangle,
  CircleCheck,
  CircleX,
  Info,
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
import {
  elevation,
  hexToRgba,
  palette,
  radius,
  spacing,
  iconSize,
  AppText,
  useLayoutMetrics,
  useStyles,
  font,
  type Theme,
} from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

type ToastType = 'success' | 'error' | 'info' | 'warning';

type ToastAction = { label: string; onPress: () => void };

type ToastState = {
  id: number;
  line: string;
  type: ToastType;
  durationMs: number;
  action?: ToastAction;
};

type ShowOpts = { message?: string; type?: ToastType; action?: ToastAction };

interface ToastContextValue {
  show: (title: string, opts?: ShowOpts) => void;
  /** Action déjà appliquée, annulable quelques secondes (ex. « Passage effectué » → Annuler). */
  showUndo: (title: string, onUndo: () => void) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION_MS = 3200;
/** Laisse le temps de lire et d'atteindre « Annuler ». */
const ACTION_DURATION_MS = 6000;
const MAX_LINE_LEN = 72;

function toastMetaFor(type: ToastType, c: ReturnType<typeof useAppColors>) {
  switch (type) {
    case 'success':
      return { Icon: CircleCheck, iconColor: c.success, accent: c.success };
    case 'error':
      return { Icon: CircleX, iconColor: c.error, accent: c.error };
    case 'warning':
      return { Icon: AlertTriangle, iconColor: c.warning, accent: c.warning };
    default:
      return { Icon: Info, iconColor: c.primaryDark, accent: c.primary };
  }
}

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
  const { action } = toast;
  const c = useAppColors();
  const layout = useLayoutMetrics();
  const styles = useStyles(buildStyles);
  const meta = toastMetaFor(toast.type, c);
  const { Icon } = meta;
  const progress = useSharedValue(1);
  const trackWidth = useSharedValue(0);

  useEffect(() => {
    progress.value = 1;
    progress.value = withTiming(0, {
      duration: toast.durationMs,
      easing: Easing.linear,
    });
  }, [progress, toast.id, toast.durationMs]);

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
      style={[styles.toastWrap, { maxWidth: layout.contentMaxWidth }]}
    >
      <Pressable
        onPress={onDismiss}
        accessibilityRole="alert"
        accessibilityLabel={toast.line}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressablePressed]}
      >
        <Shell {...shellProps} style={styles.card}>
          <Row gap={spacing[2.5]} align="center" style={styles.rowInner}>
            <Icon size={iconSize.sm} color={meta.iconColor} strokeWidth={2.35} />
            <AppText style={styles.line} numberOfLines={3} ellipsizeMode="tail">
              {toast.line}
            </AppText>
            {action ? (
              <Pressable
                onPress={() => {
                  action.onPress();
                  onDismiss();
                }}
                hitSlop={spacing[2]}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                style={({ pressed }) => [styles.action, pressed && styles.pressablePressed]}
              >
                <AppText style={styles.actionLabel}>{action.label}</AppText>
              </Pressable>
            ) : null}
          </Row>
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

/** iOS : les sheets natives sont présentées au-dessus de la vue racine ; le toast passe dans sa propre fenêtre. */
function ToastLayer({ children }: { children: ReactNode }) {
  return Platform.OS === 'ios' ? <FullWindowOverlay>{children}</FullWindowOverlay> : <>{children}</>;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const styles = useStyles(buildStyles);

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
      const durationMs = opts?.action ? ACTION_DURATION_MS : DURATION_MS;
      setToast({
        id: idRef.current,
        line: buildToastLine(title, opts?.message),
        type: opts?.type ?? 'info',
        durationMs,
        action: opts?.action,
      });
      timerRef.current = setTimeout(hide, durationMs);
    },
    [hide],
  );

  const showUndo = useCallback(
    (title: string, onUndo: () => void) =>
      show(title, { type: 'success', action: { label: 'Annuler', onPress: onUndo } }),
    [show],
  );

  const value = useMemo(() => ({ show, showUndo }), [show, showUndo]);

  return (
    <ToastContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        {toast ? (
          <ToastLayer>
            <View
              style={[styles.host, { top: top + spacing[2] }]}
              pointerEvents="box-none"
            >
              <ToastCard key={toast.id} toast={toast} onDismiss={hide} />
            </View>
          </ToastLayer>
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

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  root: {
    minWidth: 0,
    flex: 1,
  },
  host: {
    position: 'absolute' as const,
    left: spacing[5],
    right: spacing[5],
    zIndex: 9999,
    alignItems: 'center' as const,
  },
  toastWrap: {
    width: '100%' as const,
  },
  pressable: {
    width: '100%' as const,
    borderRadius: radius.full,
    overflow: 'hidden' as const,
    ...elevation.md,
  },
  pressablePressed: {
    opacity: 0.9,
  },
  card: {
    borderRadius: radius.full,
    overflow: 'hidden' as const,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: hexToRgba(palette.slate[900], 0.07),
    backgroundColor: Platform.OS === 'ios' ? hexToRgba(c.surface, 0.82) : c.surface,
  },
  androidShell: {
    backgroundColor: hexToRgba(c.surface, 0.98),
  },
  rowInner: {
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[3.5],
  },
  line: {
    flex: 1,
    minWidth: 0,
    ...font.semiBold,
    fontSize: fontSize.xs,
    color: c.textPrimary,
    letterSpacing: -0.15,
  },
  action: {
    minHeight: 44,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing[2],
    marginVertical: -spacing[2.5],
  },
  actionLabel: {
    ...font.bold,
    fontSize: fontSize.xs,
    color: c.primaryDark,
  },
  progressTrack: {
    height: 1.5,
    backgroundColor: hexToRgba(palette.slate[900], 0.05),
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%' as const,
    opacity: 0.45,
  },
};
}

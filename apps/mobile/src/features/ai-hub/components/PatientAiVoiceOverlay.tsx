import type { AppColors } from '@/theme/colors';
import { hexToRgba } from '@/theme/color-utils';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import type { AiAppointmentDraft } from '@oneandlab/shared-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { CaryAiBookingRecapCard } from '@/features/ai-hub/components/CaryAiBookingRecapCard';
import { CaryAiVoiceDocumentUpload } from '@/features/ai-hub/components/CaryAiVoiceDocumentUpload';
import type { VoicePhase, VoiceTurn } from '../hooks/use-voice-session';
import { canConfirmAiDraftRecap, shouldShowAiDraftRecap } from '../utils/should-show-ai-draft-recap';
import {
  draftPendingUploadType,
  shouldShowAiDraftDocumentUpload,
} from '../utils/should-show-ai-draft-documents';
import type { CarePhotoPickSource } from '@/lib/uploads/pick-care-photo';
import { H_PADDING, radius, spacing } from '@/theme';
import { fontFamily, fontSize, lh } from '@/theme/typography';

const DOCK_WAVEFORM_BARS = 32;

type ActivityMode = 'idle' | 'user' | 'assistant' | 'processing';

interface Props {
  visible: boolean;
  onClose: () => void;
  phase: VoicePhase;
  recognizing: boolean;
  available: boolean;
  liveTranscript: string;
  turns: VoiceTurn[];
  lastUserText: string | null;
  lastResponse: string | null;
  speechError: string | null;
  activeDraft?: AiAppointmentDraft | null;
  confirmingDraft?: boolean;
  attachingDocument?: boolean;
  onConfirmDraft?: (draft: AiAppointmentDraft) => void;
  onAttachDocument?: (source: CarePhotoPickSource) => void;
  onStart: () => void;
  onStop: () => void;
}

function resolveActivityMode(phase: VoicePhase, sessionActive: boolean): ActivityMode {
  if (phase === 'processing') return 'processing';
  if (phase === 'speaking') return 'assistant';
  if (sessionActive && phase === 'listening') return 'user';
  return 'idle';
}

function statusCopy(
  phase: VoicePhase,
  sessionActive: boolean,
  available: boolean,
  hasUserMessage: boolean,
): { title: string; sub: string } {
  if (!available) {
    return {
      title: 'Voix indisponible',
      sub: 'Installez l’app Cary (pas Expo Go) pour parler à l’assistant.',
    };
  }
  if (phase === 'processing') {
    return hasUserMessage
      ? { title: 'Cary réfléchit…', sub: 'Analyse de votre message.' }
      : { title: 'Connexion…', sub: 'Cary se présente…' };
  }
  if (phase === 'speaking') {
    return { title: 'Cary parle', sub: 'Écoutez — le micro reprendra ensuite.' };
  }
  if (sessionActive && phase === 'listening') {
    return {
      title: 'Je vous écoute',
      sub: 'Parlez naturellement — vos mots s’affichent en direct.',
    };
  }
  return { title: 'Mode vocal', sub: 'Ouverture de la session…' };
}

function TurnBubble({
  turn,
  styles,
}: {
  turn: VoiceTurn;
  styles: ReturnType<typeof buildStyles>;
}) {
  const c = useAppColors();
  const isUser = turn.role === 'user';
  return (
    <Animated.View
      entering={FadeInDown.duration(280).springify().damping(18)}
      style={[styles.turnBubble, isUser ? styles.turnUser : styles.turnAssistant]}
    >
      <Text style={[styles.turnLabel, { color: isUser ? c.primary : c.textSecondary }]}>
        {isUser ? 'Vous' : 'Cary'}
      </Text>
      <Text style={[styles.turnText, { color: c.textPrimary }]}>{turn.text}</Text>
    </Animated.View>
  );
}

function ProcessingBubble({ styles }: { styles: ReturnType<typeof buildStyles> }) {
  const c = useAppColors();
  const d1 = useSharedValue(0.35);
  const d2 = useSharedValue(0.35);
  const d3 = useSharedValue(0.35);

  useEffect(() => {
    const pulse = (v: typeof d1, delay: number) => {
      v.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 360, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.35, { duration: 360, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          false,
        ),
      );
    };
    pulse(d1, 0);
    pulse(d2, 120);
    pulse(d3, 240);
    return () => {
      cancelAnimation(d1);
      cancelAnimation(d2);
      cancelAnimation(d3);
    };
  }, [d1, d2, d3]);

  const s1 = useAnimatedStyle(() => ({ opacity: d1.value, transform: [{ scale: 0.85 + d1.value * 0.25 }] }));
  const s2 = useAnimatedStyle(() => ({ opacity: d2.value, transform: [{ scale: 0.85 + d2.value * 0.25 }] }));
  const s3 = useAnimatedStyle(() => ({ opacity: d3.value, transform: [{ scale: 0.85 + d3.value * 0.25 }] }));

  return (
    <View style={[styles.turnBubble, styles.turnAssistant]}>
      <Text style={[styles.turnLabel, { color: c.textSecondary }]}>Cary</Text>
      <Row gap={spacing[1.5]} align="center">
        <Animated.View style={[styles.typingDot, { backgroundColor: c.textTertiary }, s1]} />
        <Animated.View style={[styles.typingDot, { backgroundColor: c.textTertiary }, s2]} />
        <Animated.View style={[styles.typingDot, { backgroundColor: c.textTertiary }, s3]} />
      </Row>
    </View>
  );
}

function DockWaveBar({
  index,
  mode,
  styles,
}: {
  index: number;
  mode: ActivityMode;
  styles: ReturnType<typeof buildStyles>;
}) {
  const c = useAppColors();
  const level = useSharedValue(0.18);
  const active = mode === 'user' || mode === 'assistant';

  useEffect(() => {
    cancelAnimation(level);
    if (mode === 'processing' || mode === 'idle') {
      level.value = withTiming(mode === 'processing' ? 0.32 + (index % 3) * 0.08 : 0.14, { duration: 320 });
      return;
    }

    const isAssistant = mode === 'assistant';
    const peak = isAssistant
      ? 0.42 + (index % 5) * 0.1
      : 0.58 + (index % 4) * 0.14;
    const up = isAssistant ? 320 + (index % 4) * 90 : 180 + (index % 3) * 60;
    const down = isAssistant ? 280 + (index % 3) * 70 : 160 + (index % 2) * 50;

    level.value = withDelay(
      index * (isAssistant ? 42 : 28),
      withRepeat(
        withSequence(
          withTiming(peak, { duration: up, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.16, { duration: down, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, [active, index, level, mode]);

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: level.value }],
    opacity: interpolate(level.value, [0.14, 0.95], [0.35, 1]),
  }));

  const color =
    mode === 'assistant'
      ? hexToRgba(c.primaryDark, 0.9)
      : mode === 'user'
        ? hexToRgba(c.primary, 0.92)
        : hexToRgba(c.textTertiary, mode === 'processing' ? 0.55 : 0.28);

  return <Animated.View style={[styles.dockWaveBar, barStyle, { backgroundColor: color }]} />;
}

function VoiceActivityDock({
  mode,
  status,
  sessionActive,
  styles,
}: {
  mode: ActivityMode;
  status: { title: string; sub: string };
  sessionActive: boolean;
  styles: ReturnType<typeof buildStyles>;
}) {
  const c = useAppColors();
  const pulse = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(pulse);
    if (!sessionActive || mode === 'idle') {
      pulse.value = withTiming(1, { duration: 240 });
      return;
    }
    const scale = mode === 'assistant' ? 1.04 : mode === 'processing' ? 1.02 : 1.06;
    pulse.value = withRepeat(
      withSequence(
        withTiming(scale, { duration: mode === 'assistant' ? 620 : 480, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: mode === 'assistant' ? 620 : 480, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [mode, pulse, sessionActive]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const showWave = sessionActive && mode !== 'idle';
  const orbColor =
    mode === 'assistant'
      ? c.primaryDark
      : mode === 'processing'
        ? hexToRgba(c.primary, 0.75)
        : c.primary;

  return (
    <View style={styles.dock}>
      <LinearGradient
        colors={[hexToRgba(c.background, 0), hexToRgba(c.background, 0.92), c.background]}
        locations={[0, 0.35, 1]}
        style={styles.dockFade}
        pointerEvents="none"
      />

      <View style={styles.dockInner}>
        <Text style={[styles.dockTitle, { color: c.textPrimary }]}>{status.title}</Text>

        <View style={styles.dockWaveZone}>
          {showWave ? (
            <Animated.View entering={FadeIn.duration(220)} style={styles.dockWaveRow}>
              {Array.from({ length: DOCK_WAVEFORM_BARS }, (_, i) => (
                <DockWaveBar key={i} index={i} mode={mode} styles={styles} />
              ))}
            </Animated.View>
          ) : (
            <Text style={[styles.dockHint, { color: c.textTertiary }]}>{status.sub}</Text>
          )}
        </View>

        {showWave ? (
          <Animated.View
            style={[styles.voiceOrb, orbStyle, { backgroundColor: hexToRgba(orbColor, 0.18) }]}
          >
            <View style={[styles.voiceOrbCore, { backgroundColor: orbColor }]} />
          </Animated.View>
        ) : null}

        {showWave ? (
          <Text style={[styles.dockSub, { color: c.textSecondary }]} numberOfLines={2}>
            {status.sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Mode vocal Cary — fil conversation + activité audio en bas (UX type ChatGPT). */
export function PatientAiVoiceOverlay({
  visible,
  onClose,
  phase,
  recognizing,
  available,
  liveTranscript,
  turns,
  speechError,
  activeDraft,
  confirmingDraft,
  attachingDocument,
  onConfirmDraft,
  onAttachDocument,
  onStart,
  onStop,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const insets = useSafeAreaInsets();
  const [started, setStarted] = useState(false);
  const transcriptRef = useRef<ScrollView>(null);

  const sessionActive = started && available;
  const hasUserMessage = turns.some((t) => t.role === 'user');
  const activityMode = resolveActivityMode(phase, sessionActive);
  const status = statusCopy(phase, sessionActive, available, hasUserMessage);
  const showRecap =
    activeDraft && shouldShowAiDraftRecap(activeDraft) && onConfirmDraft != null;
  const showDocumentUpload =
    activeDraft &&
    shouldShowAiDraftDocumentUpload(activeDraft) &&
    onAttachDocument != null;
  const docUploadLabel =
    draftPendingUploadType(activeDraft ?? null) === 'ordonnance'
      ? 'Joignez votre ordonnance'
      : 'Joignez le document';

  useEffect(() => {
    if (visible && !started) {
      setStarted(true);
      void onStart();
    }
    if (!visible && started) {
      setStarted(false);
      onStop();
    }
  }, [onStart, onStop, started, visible]);

  useEffect(() => {
    if (turns.length > 0 || liveTranscript || phase === 'processing' || phase === 'speaking') {
      transcriptRef.current?.scrollToEnd({ animated: true });
    }
  }, [turns.length, liveTranscript, phase]);

  const handleClose = useCallback(() => {
    onStop();
    onClose();
  }, [onClose, onStop]);

  if (!visible) return null;

  const liveLine =
    phase === 'listening' && liveTranscript.trim() ? liveTranscript.trim() : null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={[styles.root, { backgroundColor: c.background }]}>
        <LinearGradient
          colors={[c.background, hexToRgba(c.primaryLight, 0.35), c.background]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={[styles.shell, { paddingTop: insets.top }]}>
          <Row justify="end" style={styles.header}>
            <Pressable
              onPress={handleClose}
              hitSlop={12}
              style={[styles.closeBtn, { backgroundColor: hexToRgba(c.textPrimary, 0.06) }]}
              accessibilityRole="button"
              accessibilityLabel="Fermer le mode vocal"
            >
              <X size={22} color={c.textSecondary} strokeWidth={2.25} />
            </Pressable>
          </Row>

          <ScrollView
            ref={transcriptRef}
            style={styles.transcriptScroll}
            contentContainerStyle={[
              styles.transcriptContent,
              { paddingBottom: showRecap || showDocumentUpload ? spacing[2] : spacing[4] },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {turns.map((turn) => (
              <TurnBubble key={turn.id} turn={turn} styles={styles} />
            ))}

            {liveLine ? (
              <Animated.View
                entering={FadeIn.duration(200)}
                style={[styles.turnBubble, styles.turnLive]}
              >
                <Text style={[styles.turnLabel, { color: c.primary }]}>Vous · en direct</Text>
                <Text style={[styles.turnText, styles.turnTextLive, { color: c.textPrimary }]}>
                  {liveLine}
                </Text>
              </Animated.View>
            ) : null}

            {phase === 'processing' ? <ProcessingBubble styles={styles} /> : null}
          </ScrollView>

          {showDocumentUpload ? (
            <View style={styles.recapWrap}>
              <CaryAiVoiceDocumentUpload
                label={docUploadLabel}
                attaching={attachingDocument}
                onPick={onAttachDocument!}
              />
            </View>
          ) : null}

          {showRecap ? (
            <View style={styles.recapWrap}>
              <CaryAiBookingRecapCard
                draft={activeDraft}
                canConfirm={canConfirmAiDraftRecap(activeDraft)}
                confirming={confirmingDraft}
                onConfirm={onConfirmDraft}
              />
            </View>
          ) : null}

          <View style={{ paddingBottom: insets.bottom }}>
            <VoiceActivityDock
              mode={activityMode}
              status={status}
              sessionActive={sessionActive}
              styles={styles}
            />

            <View style={styles.footer}>
              {speechError ? (
                <Text style={[styles.caption, { color: c.error }]}>{speechError}</Text>
              ) : (
                <Text style={[styles.captionMuted, { color: c.textTertiary }]}>
                  Conversation mains libres — parlez, Cary répond à voix haute.
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** @deprecated Utiliser PatientAiVoiceOverlay */
export const PatientAiVoiceMockOverlay = PatientAiVoiceOverlay;

function buildStyles(_c: AppColors) {
  return {
    root: { minWidth: 0, flex: 1 },
    shell: { minWidth: 0, flex: 1 },
    header: { paddingHorizontal: H_PADDING, paddingBottom: spacing[1] },
    closeBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    transcriptScroll: { minWidth: 0, flex: 1 },
    transcriptContent: {
      paddingHorizontal: spacing[4],
      gap: spacing[2.5],
      paddingTop: spacing[1],
      flexGrow: 1,
    },
    turnBubble: {
      borderRadius: radius.xl,
      paddingHorizontal: spacing[3.5],
      paddingVertical: spacing[2.5],
      maxWidth: '92%' as const,
    },
    turnUser: {
      alignSelf: 'flex-end' as const,
      backgroundColor: hexToRgba(_c.primary, 0.12),
    },
    turnAssistant: {
      alignSelf: 'flex-start' as const,
      backgroundColor: _c.surfaceAlt,
    },
    turnLive: {
      alignSelf: 'flex-end' as const,
      backgroundColor: hexToRgba(_c.primary, 0.06),
      borderWidth: 1,
      borderColor: hexToRgba(_c.primary, 0.22),
    },
    turnLabel: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      marginBottom: spacing[0.5],
      textTransform: 'uppercase' as const,
      letterSpacing: 0.4,
    },
    turnText: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.md,
      lineHeight: lh(fontSize.md, 1.45),
    },
    turnTextLive: {
      fontFamily: fontFamily.medium,
    },
    typingDot: {
      width: 8,
      height: 8,
      borderRadius: radius.full,
    },
    recapWrap: { paddingHorizontal: spacing[4], paddingBottom: spacing[2] },
    dock: {
      paddingTop: spacing[2],
      paddingHorizontal: H_PADDING,
    },
    dockFade: {
      position: 'absolute' as const,
      left: 0,
      right: 0,
      top: -spacing[8],
      height: spacing[8],
    },
    dockInner: {
      alignItems: 'center' as const,
      gap: spacing[2],
    },
    dockTitle: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      textAlign: 'center' as const,
    },
    dockSub: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs, 1.4),
      textAlign: 'center' as const,
      paddingHorizontal: spacing[4],
    },
    dockHint: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      textAlign: 'center' as const,
      paddingHorizontal: spacing[4],
    },
    dockWaveZone: {
      width: '100%' as const,
      height: 52,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    dockWaveRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 3,
      height: 52,
      width: '100%' as const,
      paddingHorizontal: spacing[1],
    },
    dockWaveBar: {
      width: 3,
      height: 44,
      borderRadius: radius.full,
    },
    voiceOrb: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    voiceOrbCore: {
      width: 20,
      height: 20,
      borderRadius: 10,
    },
    footer: {
      paddingHorizontal: spacing[5],
      paddingTop: spacing[1],
      paddingBottom: spacing[3],
      minHeight: 40,
      justifyContent: 'center' as const,
    },
    caption: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      lineHeight: lh(fontSize.sm, 1.45),
      textAlign: 'center' as const,
    },
    captionMuted: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs, 1.45),
      textAlign: 'center' as const,
    },
  };
}

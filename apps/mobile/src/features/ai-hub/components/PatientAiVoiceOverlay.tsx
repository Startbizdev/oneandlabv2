import type { AppColors } from '@/theme/colors';
import { hexToRgba } from '@/theme/color-utils';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import type { AiAppointmentDraft } from '@oneandlab/shared-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
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
import { H_PADDING, radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize, lh } from '@/theme/typography';

/** Réserve bas d’écran pour l’orbe + safe area — évite que le fil soit masqué. */
const TRANSCRIPT_DOCK_CLEARANCE = 196;

type ActivityMode = 'idle' | 'user' | 'assistant' | 'processing';

interface Props {
  visible: boolean;
  onClose: () => void;
  phase: VoicePhase;
  recognizing: boolean;
  available: boolean;
  voiceEnergy?: number;
  turns: VoiceTurn[];
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

function statusTitle(
  phase: VoicePhase,
  sessionActive: boolean,
  available: boolean,
  hasUserMessage: boolean,
): string | null {
  if (!available) return 'Voix indisponible';
  if (phase === 'processing') return hasUserMessage ? 'Réflexion…' : 'Connexion…';
  if (phase === 'speaking') return 'Cary parle';
  if (sessionActive && phase === 'listening') return null;
  return '…';
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
      <AppText style={[styles.turnLabel, { color: isUser ? c.primary : c.textSecondary }]}>
        {isUser ? 'Vous' : 'Cary'}
      </AppText>
      <AppText style={[styles.turnText, { color: c.textPrimary }]}>{turn.text}</AppText>
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
      <AppText style={[styles.turnLabel, { color: c.textSecondary }]}>Cary</AppText>
      <Row gap={spacing[1.5]} align="center">
        <Animated.View style={[styles.typingDot, { backgroundColor: c.textTertiary }, s1]} />
        <Animated.View style={[styles.typingDot, { backgroundColor: c.textTertiary }, s2]} />
        <Animated.View style={[styles.typingDot, { backgroundColor: c.textTertiary }, s3]} />
      </Row>
    </View>
  );
}

function VoiceOrbDock({
  mode,
  title,
  voiceEnergy,
  sessionActive,
  styles,
}: {
  mode: ActivityMode;
  title: string | null;
  voiceEnergy: number;
  sessionActive: boolean;
  styles: ReturnType<typeof buildStyles>;
}) {
  const c = useAppColors();
  const breathe = useSharedValue(1);
  const ring = useSharedValue(0.72);
  const energy = useSharedValue(0);

  useEffect(() => {
    energy.value = withTiming(voiceEnergy, { duration: 120 });
  }, [energy, voiceEnergy]);

  useEffect(() => {
    cancelAnimation(breathe);
    cancelAnimation(ring);
    if (!sessionActive || mode === 'idle') {
      breathe.value = withTiming(1, { duration: 280 });
      ring.value = withTiming(0.72, { duration: 280 });
      return;
    }

    const breatheScale =
      mode === 'user' ? 1.08 : mode === 'assistant' ? 1.05 : mode === 'processing' ? 1.03 : 1;
    const breatheMs = mode === 'assistant' ? 900 : mode === 'processing' ? 1100 : 700;

    breathe.value = withRepeat(
      withSequence(
        withTiming(breatheScale, { duration: breatheMs, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: breatheMs, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );

    ring.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: breatheMs + 120, easing: Easing.out(Easing.quad) }),
        withTiming(0.72, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [breathe, mode, ring, sessionActive]);

  const orbColor = mode === 'assistant' ? c.primaryDark : c.primary;
  const orbStyle = useAnimatedStyle(() => {
    const energyBoost = mode === 'user' ? energy.value * 0.14 : 0;
    return {
      transform: [{ scale: breathe.value + energyBoost }],
    };
  });

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ring.value }],
    opacity: interpolate(ring.value, [0.72, 1.18], [0.45, 0]),
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring.value * 0.88 }],
    opacity: interpolate(ring.value, [0.72, 1.18], [0.28, 0]),
  }));

  const coreStyle = useAnimatedStyle(() => ({
    opacity: mode === 'processing' ? 0.72 : 0.92 + energy.value * 0.08,
    transform: [{ scale: 0.42 + energy.value * 0.12 }],
  }));

  return (
    <View style={[styles.dock, { backgroundColor: c.background }]}>
      <View style={styles.dockInner}>
        <View style={styles.orbStage}>
          <Animated.View
            style={[styles.orbRing, ring2Style, { borderColor: hexToRgba(orbColor, 0.18) }]}
          />
          <Animated.View
            style={[styles.orbRing, ringStyle, { borderColor: hexToRgba(orbColor, 0.28) }]}
          />
          <Animated.View
            style={[
              styles.voiceOrb,
              orbStyle,
              { backgroundColor: hexToRgba(orbColor, mode === 'processing' ? 0.12 : 0.2) },
            ]}
          >
            <Animated.View
              style={[
                styles.voiceOrbCore,
                coreStyle,
                { backgroundColor: mode === 'processing' ? hexToRgba(orbColor, 0.8) : orbColor },
              ]}
            />
          </Animated.View>
        </View>

        {title ? (
          <AppText style={[styles.dockTitle, { color: c.textSecondary }]}>{title}</AppText>
        ) : null}
      </View>
    </View>
  );
}

/** Mode vocal Cary — fil conversation + orbe d’activité. */
export function PatientAiVoiceOverlay({
  visible,
  onClose,
  phase,
  available,
  voiceEnergy = 0,
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
  const title = statusTitle(phase, sessionActive, available, hasUserMessage);
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
    if (turns.length > 0 || phase === 'processing' || phase === 'speaking') {
      transcriptRef.current?.scrollToEnd({ animated: true });
    }
  }, [turns.length, phase]);

  const handleClose = useCallback(() => {
    onStop();
    onClose();
  }, [onClose, onStop]);

  if (!visible) return null;

  const dockClearance = TRANSCRIPT_DOCK_CLEARANCE + insets.bottom + (speechError ? spacing[6] : 0);

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
          colors={[c.background, hexToRgba(c.primaryLight, 0.28), c.background]}
          locations={[0, 0.42, 1]}
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
              <X size={iconSize.mdLg} color={c.textSecondary} strokeWidth={2.25} />
            </Pressable>
          </Row>

        <View style={styles.body}>
          <ScrollView
            ref={transcriptRef}
            style={styles.transcriptScroll}
            contentContainerStyle={[
              styles.transcriptContent,
              {
                paddingBottom:
                  dockClearance + (showRecap || showDocumentUpload ? spacing[4] : spacing[2]),
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {turns.map((turn) => (
              <TurnBubble key={turn.id} turn={turn} styles={styles} />
            ))}

            {phase === 'processing' ? <ProcessingBubble styles={styles} /> : null}
          </ScrollView>

          {showDocumentUpload ? (
            <View style={[styles.recapWrap, { backgroundColor: c.background }]}>
              <CaryAiVoiceDocumentUpload
                label={docUploadLabel}
                attaching={attachingDocument}
                onPick={onAttachDocument!}
              />
            </View>
          ) : null}

          {showRecap ? (
            <View style={[styles.recapWrap, { backgroundColor: c.background }]}>
              <CaryAiBookingRecapCard
                draft={activeDraft}
                canConfirm={canConfirmAiDraftRecap(activeDraft)}
                confirming={confirmingDraft}
                onConfirm={onConfirmDraft}
              />
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.bottomBar,
            {
              paddingBottom: insets.bottom,
              backgroundColor: c.background,
              borderTopColor: hexToRgba(c.textPrimary, 0.08),
            },
          ]}
        >
          <VoiceOrbDock
            mode={activityMode}
            title={title}
            voiceEnergy={voiceEnergy}
            sessionActive={sessionActive}
            styles={styles}
          />

          {speechError ? (
            <AppText style={[styles.errorCaption, { color: c.error }]}>{speechError}</AppText>
          ) : null}
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
    body: { minWidth: 0, flex: 1 },
    bottomBar: {
      borderTopWidth: StyleSheet.hairlineWidth,
    },
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
      minWidth: 0,
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
    typingDot: {
      width: 8,
      height: 8,
      borderRadius: radius.full,
    },
    recapWrap: { paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
    dock: {
      paddingTop: spacing[2],
      paddingHorizontal: H_PADDING,
    },
    dockInner: {
      alignItems: 'center' as const,
      gap: spacing[3],
    },
    dockTitle: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      textAlign: 'center' as const,
    },
    orbStage: {
      width: 120,
      height: 120,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    orbRing: {
      position: 'absolute' as const,
      width: 96,
      height: 96,
      borderRadius: 48,
      borderWidth: 1.5,
    },
    voiceOrb: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    voiceOrbCore: {
      width: 96,
      height: 96,
      borderRadius: 48,
    },
    errorCaption: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      lineHeight: lh(fontSize.sm, 1.45),
      textAlign: 'center' as const,
      paddingHorizontal: spacing[5],
      paddingTop: spacing[1],
      paddingBottom: spacing[2],
    },
  };
}

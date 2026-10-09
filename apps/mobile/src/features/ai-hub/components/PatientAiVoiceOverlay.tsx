import type { AiAppointmentDraft, AiEmergency } from '@oneandlab/shared-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeInDown,
  cancelAnimation,
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
import { Button } from '@/components/ui/Button';
import { CaryAiBookingRecapCard } from '@/features/ai-hub/components/CaryAiBookingRecapCard';
import { CARY_AI_NOTICE } from '@/features/ai-hub/components/CaryAiDisclosure';
import { CaryAiEmergencyBanner, CaryAiEmergencyCard } from '@/features/ai-hub/components/CaryAiEmergency';
import { CaryAiVoiceDocumentUpload } from '@/features/ai-hub/components/CaryAiVoiceDocumentUpload';
import { CaryVoiceOrb, type VoiceActivityMode } from '@/features/ai-hub/components/CaryVoiceOrb';
import type { AiBookingConsent } from '../hooks/use-ai-booking-draft';
import type { VoicePhase, VoiceTurn } from '../hooks/use-voice-session';
import { canConfirmAiDraftRecap, shouldShowAiDraftRecap } from '../utils/should-show-ai-draft-recap';
import {
  draftPendingUploadType,
  shouldShowAiDraftDocumentUpload,
} from '../utils/should-show-ai-draft-documents';
import type { CarePhotoPickSource } from '@/lib/uploads/pick-care-photo';
import { useAppColors } from '@/theme/use-app-colors';
import {
  H_PADDING,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
  iconSize,
  AppText,
  useStyles,
  font,
  lh,
  type Theme,
  ICON_STROKE_WIDTH,
} from '@/theme';

/** Réserve bas d’écran pour l’orbe + safe area — évite que le fil soit masqué. */
const TRANSCRIPT_DOCK_CLEARANCE = 196;
const TYPING_DOT = 8;

interface Props {
  visible: boolean;
  onClose: () => void;
  phase: VoicePhase;
  recognizing: boolean;
  available: boolean;
  voiceEnergy?: number;
  turns: VoiceTurn[];
  speechError: string | null;
  /** Signe d'urgence détecté par le serveur : même carte que dans le fil écrit. */
  emergency?: AiEmergency | null;
  activeDraft?: AiAppointmentDraft | null;
  confirmingDraft?: boolean;
  bookingConsent?: AiBookingConsent | null;
  attachingDocument?: boolean;
  onConfirmDraft?: (draft: AiAppointmentDraft) => void;
  onAttachDocument?: (source: CarePhotoPickSource) => void;
  onStart: () => void;
  onStop: () => void;
  onInterrupt?: () => void;
}

function resolveActivityMode(phase: VoicePhase, sessionActive: boolean): VoiceActivityMode {
  if (phase === 'connecting' || phase === 'fallback') return 'connecting';
  if (phase === 'reconnecting') return 'reconnecting';
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
  if (phase === 'connecting' || phase === 'fallback') return 'Connexion…';
  if (phase === 'reconnecting') return 'Reconnexion…';
  if (phase === 'error') return 'Erreur vocale';
  if (phase === 'processing') return hasUserMessage ? 'Réflexion…' : 'Connexion…';
  if (phase === 'speaking') return 'Cary parle';
  if (sessionActive && phase === 'listening') return 'Parlez…';
  return null;
}

/** Fil vocal : vos phrases dans une bulle neutre, celles de Cary en texte libre. */
function Turn({ turn, styles }: { turn: VoiceTurn; styles: ReturnType<typeof buildStyles> }) {
  const isUser = turn.role === 'user';
  return (
    <Animated.View
      entering={FadeInDown.duration(280).springify().damping(18)}
      style={isUser ? styles.turnUser : styles.turnAssistant}
      accessibilityLabel={`${isUser ? 'Vous' : 'Cary'} : ${turn.text}`}
    >
      <AppText style={styles.turnText}>{turn.text}</AppText>
    </Animated.View>
  );
}

function ProcessingDots({ styles }: { styles: ReturnType<typeof buildStyles> }) {
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
    <View style={styles.turnAssistant} accessible accessibilityLabel="Cary réfléchit">
      <Row gap={spacing[1.5]} align="center">
        <Animated.View style={[styles.typingDot, { backgroundColor: c.textTertiary }, s1]} />
        <Animated.View style={[styles.typingDot, { backgroundColor: c.textTertiary }, s2]} />
        <Animated.View style={[styles.typingDot, { backgroundColor: c.textTertiary }, s3]} />
      </Row>
    </View>
  );
}

/** Mode vocal Cary — fil de conversation + orbe d’activité. */
export function PatientAiVoiceOverlay({
  visible,
  onClose,
  phase,
  available,
  voiceEnergy = 0,
  turns,
  speechError,
  emergency,
  activeDraft,
  confirmingDraft,
  bookingConsent,
  attachingDocument,
  onConfirmDraft,
  onAttachDocument,
  onStart,
  onStop,
  onInterrupt,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const insets = useSafeAreaInsets();
  const [started, setStarted] = useState(false);
  const transcriptRef = useRef<ScrollView>(null);

  const sessionActive = started && available;
  const hasUserMessage = turns.some((t) => t.role === 'user');
  const activityMode = resolveActivityMode(phase, sessionActive);
  const title = statusTitle(phase, sessionActive, available, hasUserMessage);
  const showRecap = activeDraft && shouldShowAiDraftRecap(activeDraft) && onConfirmDraft != null;
  const showDocumentUpload =
    activeDraft && shouldShowAiDraftDocumentUpload(activeDraft) && onAttachDocument != null;
  const docUploadLabel =
    draftPendingUploadType(activeDraft ?? null) === 'ordonnance' ? 'Joignez votre ordonnance' : 'Joignez le document';

  const prevPhaseRef = useRef<VoicePhase>('idle');

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
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (prev === phase || !visible) return;
    if (phase === 'listening') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      void AccessibilityInfo.announceForAccessibility('Parlez maintenant');
    } else if (phase === 'speaking') {
      void Haptics.selectionAsync();
    } else if (phase === 'error') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [phase, visible]);

  useEffect(() => {
    if (turns.length > 0 || emergency || phase === 'processing' || phase === 'speaking') {
      transcriptRef.current?.scrollToEnd({ animated: true });
    }
  }, [turns.length, emergency, phase]);

  const micDenied = speechError?.toLowerCase().includes('micro') ?? false;

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
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Row justify="between" align="start" gap={spacing[3]} style={styles.header}>
          <View style={styles.disclosure}>
            <CaryAiEmergencyBanner variant="inline" />
            <AppText variant="caption" style={styles.notice}>
              {CARY_AI_NOTICE}
            </AppText>
          </View>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Fermer le mode vocal"
          >
            <X size={iconSize.lg} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
          </Pressable>
        </Row>

        <View style={styles.body}>
          <ScrollView
            ref={transcriptRef}
            style={styles.transcriptScroll}
            contentContainerStyle={[
              styles.transcriptContent,
              { paddingBottom: dockClearance + (showRecap || showDocumentUpload ? spacing[4] : spacing[2]) },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {turns.map((turn) => (
              <Turn key={turn.id} turn={turn} styles={styles} />
            ))}
            {emergency ? <CaryAiEmergencyCard emergency={emergency} /> : null}
            {phase === 'processing' ? <ProcessingDots styles={styles} /> : null}
          </ScrollView>

          {showDocumentUpload && onAttachDocument ? (
            <View style={styles.panel}>
              <CaryAiVoiceDocumentUpload label={docUploadLabel} attaching={attachingDocument} onPick={onAttachDocument} />
            </View>
          ) : null}

          {showRecap ? (
            <View style={styles.panel}>
              <CaryAiBookingRecapCard
                draft={activeDraft}
                canConfirm={canConfirmAiDraftRecap(activeDraft)}
                confirming={confirmingDraft}
                consent={bookingConsent}
                onConfirm={onConfirmDraft}
              />
            </View>
          ) : null}
        </View>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing[2] }]}>
          <CaryVoiceOrb
            mode={activityMode}
            title={title}
            voiceEnergy={voiceEnergy}
            sessionActive={sessionActive}
            onInterrupt={onInterrupt}
          />

          {speechError ? (
            <View style={styles.errorWrap}>
              <AppText variant="secondary" style={styles.errorText} accessibilityRole="alert">
                {speechError}
              </AppText>
              {micDenied ? (
                <Button
                  title="Ouvrir les réglages"
                  variant="ghost"
                  size="sm"
                  onPress={() => void Linking.openSettings()}
                />
              ) : null}
            </View>
          ) : null}

          {sessionActive ? (
            <Button
              title="Terminer"
              variant="secondary"
              onPress={handleClose}
              accessibilityLabel="Terminer la conversation vocale"
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    root: { minWidth: 0, flex: 1, backgroundColor: c.background },
    body: { minWidth: 0, flex: 1 },
    header: { paddingHorizontal: H_PADDING, paddingTop: spacing[2], paddingBottom: spacing[2] },
    disclosure: { flex: 1, minWidth: 0, gap: spacing[0.5] },
    notice: { color: c.textTertiary },
    closeBtn: {
      width: MIN_TOUCH_TARGET,
      height: MIN_TOUCH_TARGET,
      borderRadius: radius.full,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    closeBtnPressed: { backgroundColor: c.surfaceAlt },
    transcriptScroll: { minWidth: 0, flex: 1 },
    transcriptContent: {
      minWidth: 0,
      paddingHorizontal: H_PADDING,
      gap: spacing[4],
      paddingTop: spacing[2],
      flexGrow: 1,
    },
    turnUser: {
      alignSelf: 'flex-end' as const,
      maxWidth: '85%' as const,
      borderRadius: radius.xl,
      borderBottomRightRadius: radius.sm,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2.5],
      backgroundColor: c.surfaceAlt,
    },
    turnAssistant: { alignSelf: 'flex-start' as const, maxWidth: '100%' as const },
    turnText: {
      ...font.regular,
      fontSize: fontSize.md,
      lineHeight: lh(fontSize.md, 1.45),
      color: c.textPrimary,
    },
    typingDot: { width: TYPING_DOT, height: TYPING_DOT, borderRadius: radius.full },
    panel: { paddingHorizontal: H_PADDING, paddingVertical: spacing[2], backgroundColor: c.background },
    bottomBar: {
      alignItems: 'center' as const,
      gap: spacing[3],
      paddingTop: spacing[3],
      paddingHorizontal: H_PADDING,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderLight,
      backgroundColor: c.background,
    },
    errorWrap: { alignItems: 'center' as const, gap: spacing[1] },
    errorText: { color: c.error, textAlign: 'center' as const },
  };
}

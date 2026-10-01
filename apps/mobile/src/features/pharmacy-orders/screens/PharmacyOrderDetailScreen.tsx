import { useAppColors } from '@/theme/use-app-colors';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Send, Stethoscope, UserRound, XCircle } from 'lucide-react-native';
import type { PharmacyOrderStatus } from '@oneandlab/shared-types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { buildSettingsStyles, type SettingsRowProps } from '@/components/ui/SettingsRow';
import { pharmacyOrderPrescriptionsHref, type PharmacyOrderDetailMode } from '../utils/prescriptions-route';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Row } from '@/components/layout/primitives';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { queryKeys } from '@/lib/query-keys';
import { focusedRefetchInterval } from '@/lib/focused-refetch-interval';
import { useAppActive } from '@/lib/hooks/use-app-active';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { fetchUser } from '@/features/profile/api/profile.service';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { staffPatientHref } from '@/navigation/role-hrefs';
import type { StaffRoutePrefix } from '@/navigation/role-route-prefix';
import { ScreenKeyboardAvoidingView } from '@/components/navigation/ScreenFrame';
import { useSceneBottomInset } from '@/navigation/use-scene-bottom-inset';
import {
  fetchPharmacyOrder,
  fetchPharmacyOrderMessages,
  postPharmacyOrderMessage,
  updatePharmacyOrderStatus,
} from '../api/pharmacy-orders.service';
import {
  formatPharmacyDesiredDate,
  formatPharmacyOrderDate,
  personDisplayName,
  pharmacyFulfillmentLabel,
  pharmacyOrderBeneficiaryLabel,
  pharmacyOrderHasStaffRequester,
  pharmacyOrderOrderedByLabel,
  pharmacyOrderPharmacyLabel,
  pharmacyOrderStatusBadgeVariant,
  pharmacyOrderStatusLabel,
} from '../utils/order-display';
import { buildPhoneContactActions } from '@/utils/contact-actions';
import {
  ICON_STROKE_WIDTH,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
  iconSize,
  AppText,
  useStyles,
  font,
  type Theme,
} from '@/theme';

interface Props {
  mode: PharmacyOrderDetailMode;
  rolePrefix?: StaffRoutePrefix;
}

type StatusAction = { label: string; status: PharmacyOrderStatus; variant: 'primary' | 'outline' };

const POLL_MS = 15_000;

/** Transitions proposées à la pharmacie (miroir de `PharmacyOrderService::ALLOWED_TRANSITIONS`). */
function pharmacyStatusActions(status: PharmacyOrderStatus): StatusAction[] {
  if (status === 'en_attente') {
    return [
      { label: 'Accepter', status: 'acceptee', variant: 'primary' },
      { label: 'Demander un complément', status: 'complement_demande', variant: 'outline' },
      { label: 'Refuser', status: 'refusee', variant: 'outline' },
    ];
  }
  if (status === 'complement_demande') return [{ label: 'Repasser en attente', status: 'en_attente', variant: 'outline' }];
  if (status === 'acceptee') return [{ label: 'Mettre en cours', status: 'en_cours', variant: 'primary' }];
  if (status === 'en_cours') return [{ label: 'Marquer terminée', status: 'terminee', variant: 'primary' }];
  return [];
}

/** Détail d'une commande pharmacie : envoyée (infirmier / pro) ou reçue (officine). */
export function PharmacyOrderDetailScreen({ mode, rolePrefix }: Props) {
  const { id, messageId } = useLocalSearchParams<{ id: string; messageId?: string }>();
  const focused = useIsFocused();
  const appActive = useAppActive();
  const orderId = String(id ?? '');
  const router = useRouter();
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const sectionStyles = useStyles(buildSettingsStyles);
  const { footerPadding } = useSceneBottomInset();
  const composerInset = { paddingBottom: Math.max(footerPadding, spacing[3]) };
  const userId = useAuthStore((s) => s.user?.id);
  const isPatientViewer = useAuthStore((s) => s.user?.role === 'patient');
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const [draft, setDraft] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const orderQ = useQuery({
    queryKey: queryKeys.pharmacyOrders.detail(orderId),
    queryFn: async () => {
      const res = await fetchPharmacyOrder(orderId);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Commande introuvable');
      return res.data;
    },
    enabled: !!orderId,
    refetchInterval: focusedRefetchInterval(POLL_MS, focused, appActive),
    refetchIntervalInBackground: false,
  });

  const messagesQ = useQuery({
    queryKey: queryKeys.pharmacyOrders.messages(orderId),
    queryFn: async () => {
      const res = await fetchPharmacyOrderMessages(orderId);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Messages indisponibles');
      return res.data;
    },
    enabled: !!orderId,
    refetchInterval: focusedRefetchInterval(POLL_MS, focused, appActive),
    refetchIntervalInBackground: false,
  });

  const order = orderQ.data;
  const patientId = order?.patient_id ?? '';
  const pharmacyId = order?.pharmacy_id ?? '';
  const requesterId = order?.requester_id ?? '';
  const hasStaffRequester = !!order && pharmacyOrderHasStaffRequester(order) && requesterId !== userId;

  const patientQ = useQuery({
    queryKey: queryKeys.profile.user(patientId),
    queryFn: async () => (await fetchUser(patientId)).data,
    enabled: !!patientId,
  });

  const pharmacyQ = useQuery({
    queryKey: queryKeys.profile.user(pharmacyId),
    queryFn: async () => (await fetchUser(pharmacyId)).data,
    enabled: !!pharmacyId,
  });

  const requesterQ = useQuery({
    queryKey: queryKeys.profile.user(requesterId),
    queryFn: async () => (await fetchUser(requesterId)).data,
    enabled: !!requesterId && hasStaffRequester,
  });

  const statusMut = useMutation({
    mutationFn: async (payload: { status: PharmacyOrderStatus; rejection_reason?: string }) => {
      const res = await updatePharmacyOrderStatus(
        orderId,
        payload.status,
        payload.rejection_reason != null ? { rejection_reason: payload.rejection_reason } : undefined,
      );
      if (!res.success || !res.data) throw new Error(res.error ?? 'Mise à jour impossible');
      return res.data;
    },
    onSuccess: async () => {
      toast('Statut mis à jour', { type: 'success' });
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.pharmacyOrders.detail(orderId) }),
        qc.invalidateQueries({ queryKey: queryKeys.pharmacyOrders.list('sent') }),
        qc.invalidateQueries({ queryKey: queryKeys.pharmacyOrders.list('received') }),
      ]);
    },
    onError: (e) => handleApiError(e, toast, 'pharmacy-order-status'),
  });

  const sendMut = useMutation({
    mutationFn: async (body: string) => {
      const res = await postPharmacyOrderMessage(orderId, body);
      if (!res.success) throw new Error(res.error ?? 'Envoi impossible');
      return res.data;
    },
    onSuccess: async () => {
      setDraft('');
      await qc.invalidateQueries({ queryKey: queryKeys.pharmacyOrders.messages(orderId) });
    },
    onError: (e) => handleApiError(e, toast, 'pharmacy-order-message'),
  });

  const messages = useMemo(() => messagesQ.data?.messages ?? [], [messagesQ.data]);
  const canPost = Boolean(messagesQ.data?.can_post);
  const isReceiver = mode === 'received';

  const patientLabel = useMemo(() => {
    if (!order) return '';
    const fromApi = pharmacyOrderBeneficiaryLabel(order);
    if (fromApi !== 'Patient') return fromApi;
    return personDisplayName(patientQ.data?.first_name, patientQ.data?.last_name, 'Patient');
  }, [order, patientQ.data]);

  const pharmacyLabel = useMemo(() => {
    if (!order) return '';
    const fromApi = pharmacyOrderPharmacyLabel(order);
    if (fromApi !== 'Pharmacie') return fromApi;
    return personDisplayName(pharmacyQ.data?.first_name, pharmacyQ.data?.last_name, 'Pharmacie');
  }, [order, pharmacyQ.data]);

  useEffect(() => {
    if (!messageId || !messages.some((m) => m.id === messageId)) return;
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    return () => clearTimeout(timer);
  }, [messageId, messages]);

  if (orderQ.isLoading) {
    return (
      <StackChromeScreen>
        <ActivityIndicator style={styles.loader} color={c.primary} />
      </StackChromeScreen>
    );
  }

  if (!order) {
    return (
      <StackChromeScreen>
        <View style={styles.errorWrap}>
          <ErrorState title="Commande indisponible" error={orderQ.error} onRetry={() => void orderQ.refetch()} />
        </View>
      </StackChromeScreen>
    );
  }

  const statusActions = isReceiver ? pharmacyStatusActions(order.status) : [];
  const offersRefusal = statusActions.some((action) => action.status === 'refusee');
  const canCancel = !offersRefusal && !['terminee', 'refusee', 'annulee'].includes(order.status);
  const requesterPhone = order.requester_phone || requesterQ.data?.phone || null;
  const orderedByLine = hasStaffRequester
    ? pharmacyOrderOrderedByLabel(order, userId, { pharmacyView: isReceiver }) ??
      personDisplayName(requesterQ.data?.first_name, requesterQ.data?.last_name, 'Professionnel')
    : pharmacyOrderOrderedByLabel(order, userId);
  const deliveryAddress = order.delivery_address?.formatted_address || order.delivery_address?.label || null;

  const detailLines: Array<{ label: string; value: string; tone?: 'error' }> = [];
  if (isPatientViewer) {
    if (order.relative_id) detailLines.push({ label: 'Pour', value: patientLabel });
  } else if (!isReceiver) {
    detailLines.push({ label: 'Pharmacie', value: pharmacyLabel });
  }
  if (order.relative_id && !isPatientViewer) {
    detailLines.push({
      label: 'Titulaire',
      value: personDisplayName(patientQ.data?.first_name, patientQ.data?.last_name, '—'),
    });
  }
  if (order.desired_fulfillment_date) {
    detailLines.push({ label: 'Date souhaitée', value: formatPharmacyDesiredDate(order.desired_fulfillment_date) });
  }
  if (deliveryAddress) detailLines.push({ label: 'Adresse de livraison', value: deliveryAddress });
  if (order.requester_comment) detailLines.push({ label: 'Commentaire', value: order.requester_comment });
  if (order.pharmacy_note) detailLines.push({ label: 'Note de la pharmacie', value: order.pharmacy_note });
  if (order.rejection_reason) {
    detailLines.push({ label: 'Motif de refus', value: order.rejection_reason, tone: 'error' });
  }

  const linkItems: SettingsRowProps[] = [];
  const prescriptionCount = order.prescription_document_ids.length;
  const prescriptionsHref = pharmacyOrderPrescriptionsHref(rolePrefix, mode, orderId);
  if (prescriptionCount > 0 && prescriptionsHref) {
    linkItems.push({
      icon: FileText,
      label: prescriptionCount > 1 ? 'Ordonnances jointes' : 'Ordonnance jointe',
      value: String(prescriptionCount),
      onPress: () => router.push(prescriptionsHref),
    });
  }
  if (isReceiver) {
    linkItems.push({
      icon: UserRound,
      label: 'Fiche patient',
      onPress: () => router.push(staffPatientHref('/(pro)', order.patient_id)),
    });
    if (hasStaffRequester) {
      linkItems.push({
        icon: Stethoscope,
        label: 'Fiche du professionnel',
        onPress: () =>
          router.push({ pathname: '/(pro)/professionnel/[id]', params: { id: order.requester_id } }),
      });
    }
  }

  const confirmCancel = () => {
    Alert.alert('Annuler la commande ?', undefined, [
      { text: 'Non', style: 'cancel' },
      { text: 'Oui, annuler', style: 'destructive', onPress: () => statusMut.mutate({ status: 'annulee' }) },
    ]);
  };

  const submitReject = () => {
    const reason = rejectReason.trim();
    if (!reason) {
      toast('Motif de refus requis', { type: 'error' });
      return;
    }
    statusMut.mutate({ status: 'refusee', rejection_reason: reason });
    setShowRejectForm(false);
  };

  const sendDraft = () => {
    const text = draft.trim();
    if (!text || sendMut.isPending) return;
    sendMut.mutate(text);
  };

  return (
    <StackChromeScreen>
      <ScreenKeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Row justify="between" align="start" gap={spacing[2]}>
              <AppText variant="title" style={styles.heroTitle} accessibilityRole="header">
                {isPatientViewer ? pharmacyLabel : patientLabel}
              </AppText>
              <Badge label={pharmacyOrderStatusLabel(order.status)} variant={pharmacyOrderStatusBadgeVariant(order.status)} />
            </Row>
            <AppText variant="secondary">
              {[pharmacyFulfillmentLabel(order.fulfillment_mode), formatPharmacyOrderDate(order.created_at)]
                .filter(Boolean)
                .join(' · ')}
            </AppText>
            {orderedByLine ? <AppText variant="secondary">{orderedByLine}</AppText> : null}
          </View>

          {statusActions.length > 0 ? (
            <View style={styles.actions}>
              {statusActions.map((action) => (
                <Button
                  key={action.status}
                  title={action.label}
                  variant={action.variant}
                  loading={statusMut.isPending}
                  fullWidth
                  onPress={() => {
                    if (action.status === 'refusee') {
                      setShowRejectForm(true);
                      return;
                    }
                    statusMut.mutate({ status: action.status });
                  }}
                />
              ))}
              {showRejectForm ? (
                <View style={styles.actions}>
                  <Input
                    label="Motif de refus"
                    value={rejectReason}
                    onChangeText={setRejectReason}
                    placeholder="Obligatoire"
                  />
                  <Row gap={spacing[2]}>
                    <View style={styles.flexCell}>
                      <Button
                        title="Annuler"
                        variant="outline"
                        fullWidth
                        onPress={() => {
                          setShowRejectForm(false);
                          setRejectReason('');
                        }}
                      />
                    </View>
                    <View style={styles.flexCell}>
                      <Button title="Refuser" loading={statusMut.isPending} fullWidth onPress={submitReject} />
                    </View>
                  </Row>
                </View>
              ) : null}
            </View>
          ) : null}

          {isReceiver && hasStaffRequester && requesterPhone ? (
            <Row gap={spacing[2]}>
              {buildPhoneContactActions(requesterPhone).map((action) => (
                <View key={action.key} style={styles.flexCell}>
                  <Button title={action.label} size="sm" variant="secondary" fullWidth onPress={action.onPress} />
                </View>
              ))}
            </Row>
          ) : null}

          {detailLines.length > 0 ? (
            <View style={sectionStyles.section}>
              <AppText style={sectionStyles.sectionTitle} accessibilityRole="header">
                Détails
              </AppText>
              <Card padding="none">
                {detailLines.map((line, index) => (
                  <Fragment key={line.label}>
                    {index > 0 ? <View style={styles.divider} /> : null}
                    <View style={styles.detailRow}>
                      <AppText variant="caption">{line.label}</AppText>
                      <AppText variant="body" style={line.tone === 'error' ? styles.errorText : undefined}>
                        {line.value}
                      </AppText>
                    </View>
                  </Fragment>
                ))}
              </Card>
            </View>
          ) : null}

          {linkItems.length > 0 ? <SettingsSection items={linkItems} /> : null}

          {canCancel ? (
            <SettingsSection
              items={[
                {
                  icon: XCircle,
                  label: 'Annuler la commande',
                  destructive: true,
                  onPress: statusMut.isPending ? undefined : confirmCancel,
                },
              ]}
            />
          ) : null}

          <View style={sectionStyles.section}>
            <AppText style={sectionStyles.sectionTitle} accessibilityRole="header">
              Échanges
            </AppText>
            {messagesQ.isError && !messagesQ.data ? (
              <ErrorState
                title="Échanges indisponibles"
                error={messagesQ.error}
                onRetry={() => void messagesQ.refetch()}
              />
            ) : messagesQ.isLoading ? (
              <ActivityIndicator color={c.primary} />
            ) : !messages.length ? (
              <AppText variant="secondary" style={styles.threadEmpty}>
                Aucun message pour le moment.
              </AppText>
            ) : (
              <View style={styles.thread}>
                {messages.map((msg) => (
                  <View
                    key={msg.id}
                    style={[styles.bubble, msg.author_id === userId ? styles.bubbleMine : styles.bubbleOther]}
                  >
                    <AppText variant="caption">{msg.author_name ?? 'Utilisateur'}</AppText>
                    <AppText variant="body">{msg.body}</AppText>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {canPost ? (
          <View style={[styles.composer, composerInset]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Votre message…"
              placeholderTextColor={c.textTertiary}
              style={styles.input}
              multiline
              accessibilityLabel="Votre message"
            />
            <Pressable
              onPress={sendDraft}
              disabled={!draft.trim() || sendMut.isPending}
              style={[styles.sendBtn, !draft.trim() && styles.sendBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Envoyer"
            >
              {sendMut.isPending ? (
                <ActivityIndicator color={c.onPrimary} size="small" />
              ) : (
                <Send size={iconSize.md} color={c.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
              )}
            </Pressable>
          </View>
        ) : (
          <View style={[styles.composerClosed, composerInset]}>
            <AppText variant="secondary" style={styles.composerClosedText}>
              Conversation fermée pour cette commande.
            </AppText>
          </View>
        )}
      </ScreenKeyboardAvoidingView>
    </StackChromeScreen>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    root: { flex: 1, backgroundColor: c.background },
    content: {
      width: '100%' as const,
      alignSelf: 'stretch' as const,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
      paddingBottom: spacing[6],
      gap: spacing[6],
    },
    loader: { marginTop: spacing[8] },
    errorWrap: { paddingTop: spacing[3], flex: 1 },
    hero: { gap: spacing[1] },
    heroTitle: { flex: 1, minWidth: 0 },
    actions: { gap: spacing[2] },
    flexCell: { flex: 1, minWidth: 0 },
    detailRow: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      gap: spacing[0.5],
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.borderLight,
      marginLeft: spacing[4],
    },
    errorText: { color: c.error },
    threadEmpty: { paddingHorizontal: spacing[1] },
    thread: {
      width: '100%' as const,
      alignSelf: 'stretch' as const,
      gap: spacing[2],
    },
    bubble: {
      maxWidth: '80%' as const,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radius.lg,
      gap: spacing[0.5],
    },
    bubbleMine: {
      alignSelf: 'flex-end' as const,
      backgroundColor: c.primaryLight,
    },
    bubbleOther: {
      alignSelf: 'flex-start' as const,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
    },
    composer: {
      flexDirection: 'row' as const,
      alignItems: 'flex-end' as const,
      gap: spacing[2],
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderLight,
      backgroundColor: c.surface,
    },
    input: {
      flex: 1,
      minHeight: MIN_TOUCH_TARGET,
      maxHeight: 120,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2.5],
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
      ...font.regular,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    sendBtn: {
      width: MIN_TOUCH_TARGET,
      height: MIN_TOUCH_TARGET,
      borderRadius: radius.full,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.primary,
    },
    sendBtnDisabled: { opacity: 0.4 },
    composerClosed: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderLight,
      backgroundColor: c.surface,
    },
    composerClosedText: {
      textAlign: 'center' as const,
    },
  };
}

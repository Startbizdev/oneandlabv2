import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, MessageCircle, Send, WifiOff } from 'lucide-react-native';
import type { PharmacyOrderStatus } from '@oneandlab/shared-types';
import { Button } from '@/components/ui/Button';
import { ActionRowCard } from '@/components/ui/ActionRowCard';
import { pharmacyOrderPrescriptionsPath } from '../utils/prescriptions-route';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Row } from '@/components/layout/primitives';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { fetchUser } from '@/features/profile/api/profile.service';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { HeaderActionButton } from '@/navigation/HeaderActionButton';
import { useStackContentTopInset, useStackScrollConfig } from '@/navigation/use-stack-scroll-config';
import { spreadTabSceneScrollProps } from '@/components/navigation/liquid-glass-header-inset';
import {
  fetchPharmacyOrder,
  fetchPharmacyOrderMessages,
  postPharmacyOrderMessage,
  updatePharmacyOrderStatus,
} from '../api/pharmacy-orders.service';
import {
  formatPharmacyOrderDate,
  personDisplayName,
  pharmacyFulfillmentLabel,
  pharmacyOrderBeneficiaryLabel,
  pharmacyOrderHasStaffRequester,
  pharmacyOrderOrderedByLabel,
  pharmacyOrderPharmacyLabel,
  pharmacyOrderStatusLabel,
} from '../utils/order-display';
import { buildPhoneContactActions } from '@/utils/contact-actions';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type DetailMode = 'sent' | 'received';

interface Props {
  mode: DetailMode;
  rolePrefix?: '/(nurse)' | '/(pro)';
}

export function PharmacyOrderDetailScreen({ mode, rolePrefix }: Props) {
  const { id, messageId } = useLocalSearchParams<{ id: string; messageId?: string }>();
  const orderId = String(id ?? '');
  const router = useRouter();
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PharmacyOrderDetailScreen');
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const [draft, setDraft] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const contentTopInset = useStackContentTopInset();
  const scrollConfig = useStackScrollConfig(styles.content);

  const orderQ = useQuery({
    queryKey: queryKeys.pharmacyOrders.detail(orderId),
    queryFn: async () => {
      const res = await fetchPharmacyOrder(orderId);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Commande introuvable');
      return res.data;
    },
    enabled: !!orderId,
  });

  const messagesQ = useQuery({
    queryKey: queryKeys.pharmacyOrders.messages(orderId),
    queryFn: async () => {
      const res = await fetchPharmacyOrderMessages(orderId);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Messages indisponibles');
      return res.data;
    },
    enabled: !!orderId,
    refetchInterval: 15000,
  });

  const patientQ = useQuery({
    queryKey: queryKeys.profile.user(orderQ.data?.patient_id ?? ''),
    queryFn: async () => (await fetchUser(orderQ.data!.patient_id)).data,
    enabled: !!orderQ.data?.patient_id,
  });

  const pharmacyQ = useQuery({
    queryKey: queryKeys.profile.user(orderQ.data?.pharmacy_id ?? ''),
    queryFn: async () => (await fetchUser(orderQ.data!.pharmacy_id)).data,
    enabled: !!orderQ.data?.pharmacy_id,
  });

  const requesterQ = useQuery({
    queryKey: queryKeys.profile.user(orderQ.data?.requester_id ?? ''),
    queryFn: async () => (await fetchUser(orderQ.data!.requester_id)).data,
    enabled: !!orderQ.data?.requester_id
      && pharmacyOrderHasStaffRequester(orderQ.data)
      && orderQ.data.requester_id !== userId,
  });

  const statusMut = useMutation({
    mutationFn: async (payload: {
      status: PharmacyOrderStatus;
      rejection_reason?: string;
      pharmacy_note?: string;
    }) => {
      const res = await updatePharmacyOrderStatus(orderId, payload.status, {
        rejection_reason: payload.rejection_reason ?? null,
        pharmacy_note: payload.pharmacy_note ?? null,
      });
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

  const order = orderQ.data;
  const messages = messagesQ.data?.messages ?? [];
  const canPost = Boolean(messagesQ.data?.can_post);
  const isReceiver = mode === 'received';

  const patientLabel = useMemo(() => {
    if (!order) return '—';
    const fromApi = pharmacyOrderBeneficiaryLabel(order);
    if (fromApi !== 'Patient') return fromApi;
    return personDisplayName(patientQ.data?.first_name, patientQ.data?.last_name, 'Patient');
  }, [order, patientQ.data]);

  const pharmacyLabel = useMemo(() => {
    if (!order) return '—';
    const fromApi = pharmacyOrderPharmacyLabel(order);
    if (fromApi !== 'Pharmacie') return fromApi;
    return personDisplayName(pharmacyQ.data?.first_name, pharmacyQ.data?.last_name, 'Pharmacie');
  }, [order, pharmacyQ.data]);

  useEffect(() => {
    if (!messageId || !messages.some((m) => m.id === messageId)) return;
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    return () => clearTimeout(timer);
  }, [messageId, messages]);

  const renderPharmacyActions = () => {
    if (!order || !isReceiver) return null;
    const status = order.status;
    const actions: Array<{ label: string; status: PharmacyOrderStatus; variant?: 'outline' | 'primary' }> = [];

    if (status === 'en_attente') {
      actions.push({ label: 'Accepter', status: 'acceptee' });
      actions.push({ label: 'Demander un complément', status: 'complement_demande', variant: 'outline' });
      actions.push({ label: 'Refuser', status: 'refusee', variant: 'outline' });
    } else if (status === 'complement_demande') {
      actions.push({ label: 'Repasser en attente', status: 'en_attente', variant: 'outline' });
    } else if (status === 'acceptee') {
      actions.push({ label: 'Mettre en cours', status: 'en_cours' });
    } else if (status === 'en_cours') {
      actions.push({ label: 'Marquer terminée', status: 'terminee' });
    }

    if (!actions.length) return null;

    return (
      <View style={styles.actions}>
        {actions.map((action) => (
          <Button
            key={action.status}
            title={action.label}
            variant={action.variant ?? 'primary'}
            loading={statusMut.isPending}
            onPress={() => {
              if (action.status === 'refusee') {
                setShowRejectForm(true);
                return;
              }
              statusMut.mutate({ status: action.status });
            }}
            fullWidth
          />
        ))}
        {showRejectForm ? (
          <View style={styles.rejectBlock}>
            <Input
              label="Motif de refus"
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Obligatoire"
            />
            <Row gap={spacing[2]}>
              <Button
                title="Annuler"
                variant="outline"
                onPress={() => {
                  setShowRejectForm(false);
                  setRejectReason('');
                }}
                style={{ flex: 1 }}
              />
              <Button
                title="Confirmer le refus"
                loading={statusMut.isPending}
                onPress={() => {
                  const reason = rejectReason.trim();
                  if (!reason) {
                    toast('Motif de refus requis', { type: 'error' });
                    return;
                  }
                  statusMut.mutate({ status: 'refusee', rejection_reason: reason });
                  setShowRejectForm(false);
                }}
                style={{ flex: 1 }}
              />
            </Row>
          </View>
        ) : null}
      </View>
    );
  };

  const openNewOrder = useCallback(() => {
    if (!rolePrefix) return;
    router.push(`${rolePrefix}/commandes-pharmacie/new` as never);
  }, [rolePrefix, router]);

  const canCancel =
    !!order && !['terminee', 'refusee', 'annulee'].includes(order.status);

  const confirmCancel = () => {
    Alert.alert('Annuler la commande', 'Confirmez-vous l’annulation ?', [
      { text: 'Non', style: 'cancel' },
      { text: 'Oui, annuler', style: 'destructive', onPress: () => statusMut.mutate({ status: 'annulee' }) },
    ]);
  };

  const renderRequesterActions = () => {
    if (!order || isReceiver) return null;
    if (!rolePrefix && !canCancel) return null;

    return (
      <View style={styles.requesterActions}>
        {rolePrefix ? (
          <Button title="Nouvelle commande" onPress={openNewOrder} fullWidth />
        ) : null}
        {canCancel ? (
          <Button
            title="Annuler la commande"
            variant="outline"
            loading={statusMut.isPending}
            onPress={confirmCancel}
            fullWidth
          />
        ) : null}
      </View>
    );
  };

  const headerRight =
    mode === 'sent' && rolePrefix ? (
      <HeaderActionButton kind="add" onPress={openNewOrder} />
    ) : null;

  if (orderQ.isLoading) {
    return (
      <StackChromeScreen>
        <ActivityIndicator style={[styles.loader, { marginTop: contentTopInset }]} color={c.primary} />
      </StackChromeScreen>
    );
  }

  if (orderQ.isError || !order) {
    return (
      <StackChromeScreen>
        <View style={{ paddingTop: contentTopInset, flex: 1 }}>
          <EmptyState
            Icon={WifiOff}
            title="Commande introuvable"
            description={orderQ.error instanceof Error ? orderQ.error.message : 'Réessayez plus tard.'}
            actionLabel="Réessayer"
            onAction={() => void orderQ.refetch()}
          />
        </View>
      </StackChromeScreen>
    );
  }

  return (
    <StackChromeScreen headerRight={headerRight}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={contentTopInset}
        style={styles.root}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[scrollConfig.contentContainerStyle, styles.content]}
          {...spreadTabSceneScrollProps(scrollConfig)}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={styles.summaryCard}>
            <Row justify="between" align="center" gap={spacing[2]}>
              <AppText style={styles.summaryTitle} numberOfLines={2}>{patientLabel}</AppText>
              <View style={styles.statusBadge}>
                <AppText style={styles.statusText}>{pharmacyOrderStatusLabel(order.status)}</AppText>
              </View>
            </Row>
            <AppText style={styles.summaryDate}>
              {formatPharmacyOrderDate(order.created_at)}
              {' · '}
              {pharmacyFulfillmentLabel(order.fulfillment_mode)}
            </AppText>
            <AppText style={styles.line}>
              Patient : {patientLabel}
            </AppText>
            {isReceiver ? (
              <Pressable
                onPress={() => router.push(`/(pro)/patient/${order.patient_id}` as never)}
                accessibilityRole="button"
              >
                <AppText style={[styles.line, styles.patientLink]}>Voir la fiche patient</AppText>
              </Pressable>
            ) : null}
            {order.relative_id ? (
              <AppText style={styles.line}>
                Titulaire :{' '}
                {personDisplayName(patientQ.data?.first_name, patientQ.data?.last_name, '—')}
              </AppText>
            ) : null}
            {pharmacyOrderHasStaffRequester(order) && order.requester_id !== userId ? (
              <>
                <AppText style={styles.orderedBy}>
                  {pharmacyOrderOrderedByLabel(order, userId, { pharmacyView: isReceiver })
                    ?? personDisplayName(requesterQ.data?.first_name, requesterQ.data?.last_name, 'Professionnel')}
                </AppText>
                {isReceiver && (order.requester_phone || requesterQ.data?.phone) ? (
                  <AppText style={styles.line}>
                    Téléphone : {order.requester_phone || requesterQ.data?.phone}
                  </AppText>
                ) : null}
                {isReceiver ? (
                  <>
                    <Pressable
                      onPress={() => router.push(`/(pro)/professionnel/${order.requester_id}` as never)}
                      accessibilityRole="button"
                    >
                      <AppText style={[styles.line, styles.patientLink]}>Voir la fiche du professionnel</AppText>
                    </Pressable>
                    <Row gap={spacing[2]} wrap>
                      {buildPhoneContactActions(order.requester_phone || requesterQ.data?.phone).map((action) => (
                        <Button
                          key={action.key}
                          title={action.label}
                          size="sm"
                          variant={action.key === 'phone' ? 'primary' : 'outline'}
                          onPress={action.onPress}
                        />
                      ))}
                    </Row>
                  </>
                ) : null}
              </>
            ) : pharmacyOrderOrderedByLabel(order, userId) ? (
              <AppText style={styles.orderedBy}>{pharmacyOrderOrderedByLabel(order, userId)}</AppText>
            ) : null}
            <AppText style={styles.line} numberOfLines={2}>Pharmacie : {pharmacyLabel}</AppText>
            <AppText style={styles.line}>Mode : {pharmacyFulfillmentLabel(order.fulfillment_mode)}</AppText>
            {order.desired_fulfillment_date ? (
              <AppText style={styles.line}>Date souhaitée : {order.desired_fulfillment_date}</AppText>
            ) : null}
            {order.delivery_address?.formatted_address || order.delivery_address?.label ? (
              <AppText style={styles.line}>
                Adresse : {order.delivery_address.formatted_address ?? order.delivery_address.label}
              </AppText>
            ) : null}
            {order.requester_comment ? (
              <AppText style={styles.comment}>Commentaire : {order.requester_comment}</AppText>
            ) : null}
            {order.rejection_reason ? (
              <AppText style={styles.errorLine}>Motif de refus : {order.rejection_reason}</AppText>
            ) : null}
            {order.pharmacy_note ? (
              <AppText style={styles.comment}>Note pharmacie : {order.pharmacy_note}</AppText>
            ) : null}

            {order.prescription_document_ids.length ? (
              <ActionRowCard
                title="Ordonnances jointes"
                body={
                  order.prescription_document_ids.length === 1
                    ? '1 fichier · consulter et télécharger'
                    : `${order.prescription_document_ids.length} fichiers · consulter et télécharger`
                }
                Icon={FileText}
                iconColor={c.primaryDark}
                iconBg={c.primaryLight}
                onPress={() => {
                  const path = pharmacyOrderPrescriptionsPath(rolePrefix, mode, orderId);
                  if (path) router.push(path as never);
                }}
                accessibilityHint="Ouvre la liste des ordonnances"
              />
            ) : null}

            {renderPharmacyActions()}
            {isReceiver && canCancel ? (
              <Button
                title="Annuler la commande"
                variant="outline"
                loading={statusMut.isPending}
                onPress={confirmCancel}
                fullWidth
              />
            ) : null}
            {renderRequesterActions()}
          </Card>

          <AppText style={styles.chatTitle}>Échanges</AppText>
          {!messages.length ? (
            <EmptyState
              Icon={MessageCircle}
              title="Pas encore de message"
              description="Utilisez le fil ci-dessous pour échanger avec votre interlocuteur."
            />
          ) : (
            <View style={styles.thread}>
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.bubble,
                    msg.author_id === userId ? styles.bubbleMine : styles.bubbleOther,
                  ]}
                >
                  <AppText style={styles.author}>{msg.author_name ?? 'Utilisateur'}</AppText>
                  <AppText style={styles.body}>{msg.body}</AppText>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {canPost ? (
          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Votre message…"
              placeholderTextColor={c.textTertiary}
              style={styles.input}
              multiline
            />
            <Pressable
              onPress={() => {
                const text = draft.trim();
                if (!text || sendMut.isPending) return;
                sendMut.mutate(text);
              }}
              style={styles.sendBtn}
              accessibilityRole="button"
              accessibilityLabel="Envoyer"
            >
              {sendMut.isPending ? (
                <ActivityIndicator color={c.textInverse} size="small" />
              ) : (
                <Send size={iconSize.sm} color={c.textInverse} strokeWidth={2.5} />
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.composerClosed}>
            <AppText style={styles.composerClosedText}>Conversation fermée pour cette commande.</AppText>
          </View>
        )}
      </KeyboardAvoidingView>
    </StackChromeScreen>
  );
}

function buildStyles(c: AppColors) {
  return {
    root: { flex: 1, backgroundColor: c.background },
    content: {
      width: '100%' as const,
      alignSelf: 'stretch' as const,
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[6],
      gap: spacing[3],
    },
    loader: { marginTop: spacing[8] },
    summaryCard: { gap: spacing[2] },
    summaryTitle: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.md,
      color: c.textPrimary,
    },
    orderedBy: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      color: c.primaryDark,
      lineHeight: fontSize.sm * 1.35,
    },
    summaryDate: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    statusBadge: {
      alignSelf: 'flex-start' as const,
      paddingHorizontal: spacing[2],
      paddingVertical: spacing[0.5],
      borderRadius: radius.full,
      backgroundColor: c.primaryLight,
    },
    statusText: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      color: c.primaryDark,
    },
    line: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.45,
    },
    patientLink: {
      color: c.primary,
      fontFamily: fontFamily.semiBold,
    },
    comment: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textPrimary,
      lineHeight: fontSize.sm * 1.45,
    },
    errorLine: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      color: c.error,
    },
    actions: { gap: spacing[2], marginTop: spacing[2] },
    requesterActions: { gap: spacing[2], marginTop: spacing[3] },
    rejectBlock: { gap: spacing[2], marginTop: spacing[2] },
    chatTitle: {
      marginTop: spacing[2],
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.md,
      color: c.textPrimary,
    },
    thread: {
      width: '100%' as const,
      alignSelf: 'stretch' as const,
      gap: spacing[2],
    },
    bubble: {
      maxWidth: '78%' as const,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
    },
    bubbleMine: {
      alignSelf: 'flex-end' as const,
      backgroundColor: c.primaryLight,
    },
    bubbleOther: {
      alignSelf: 'flex-start' as const,
      backgroundColor: c.surface,
    },
    author: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      color: c.textSecondary,
      marginBottom: spacing[1],
    },
    body: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textPrimary,
      lineHeight: fontSize.sm * 1.45,
      flexShrink: 1,
    },
    composer: {
      // Zone de saisie interactive avec bouton d’envoi.
      // eslint-disable-next-line oneandlab/no-raw-flex-row
      flexDirection: 'row' as const,
      alignItems: 'flex-end' as const,
      gap: spacing[2],
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
      backgroundColor: c.surface,
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.background,
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.primary,
    },
    composerClosed: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
      backgroundColor: c.surfaceSubtle,
    },
    composerClosedText: {
      textAlign: 'center' as const,
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
  };
}

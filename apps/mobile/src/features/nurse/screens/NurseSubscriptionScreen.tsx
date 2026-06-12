import { NURSE_PLAN_LIST, NURSE_PLANS } from '@oneandlab/shared-constants';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SubscriptionPlanCard } from '@/features/nurse/components/SubscriptionPlanCard';
import { useNurseIap } from '@/features/nurse/hooks/use-nurse-iap';
import { Button } from '@/components/ui/Button';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { useAppColors } from '@/theme/use-app-colors';

const IOS_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';
const ANDROID_SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions';

function billingSourceLabel(source: string | null | undefined): string | null {
  if (source === 'apple') return 'App Store';
  if (source === 'google') return 'Google Play';
  if (source === 'stripe') return 'Site web (Stripe)';
  return null;
}

function openManageSubscriptions() {
  const url = Platform.OS === 'ios' ? IOS_SUBSCRIPTIONS_URL : ANDROID_SUBSCRIPTIONS_URL;
  void Linking.openURL(url);
}

export function NurseSubscriptionScreen() {
  const c = useAppColors();
  const insets = useSafeAreaInsets();
  const {
    subscription,
    subscriptionLoading,
    refetchSubscription,
    localizedProPrice,
    purchasePro,
    purchaseLoading,
    restore,
    restoreLoading,
    connected,
    storeLoading,
  } = useNurseIap();

  const activePlan = subscription?.plan_slug ?? 'discovery';
  const isPro = activePlan === 'nurse_pro';
  const canPurchaseStore = subscription?.can_purchase_store !== false;
  const billingLabel = billingSourceLabel(subscription?.billing_source);

  const proPriceLabel = localizedProPrice ?? NURSE_PLANS.nurse_pro.priceLabel;

  const cards = useMemo(
    () =>
      NURSE_PLAN_LIST.map((plan) => {
        const isCurrent = plan.slug === activePlan;
        const isProPlan = plan.slug === 'nurse_pro';
        let ctaLabel: string | undefined;
        let onCtaPress: (() => void) | undefined;
        let ctaLoading = false;
        let disabled = false;

        if (isProPlan) {
          if (isCurrent) {
            ctaLabel = 'Gérer mon abonnement';
            onCtaPress = openManageSubscriptions;
          } else if (canPurchaseStore) {
            const storePending = connected && storeLoading;
            ctaLabel = !connected || storePending ? 'Chargement boutique…' : 'Passer en Pro';
            onCtaPress = purchasePro;
            ctaLoading = purchaseLoading || storeLoading;
            disabled = !connected || storePending;
          } else {
            ctaLabel = 'Géré sur cary.bio';
            disabled = true;
          }
        }

        return (
          <SubscriptionPlanCard
            key={plan.slug}
            name={plan.name}
            price={isProPlan ? proPriceLabel : plan.priceLabel}
            priceSuffix={plan.priceSuffix}
            tagline={plan.tagline}
            features={plan.features}
            recommended={plan.recommended}
            isCurrent={isCurrent}
            ctaLabel={ctaLabel}
            ctaVariant={isProPlan && !isCurrent ? 'primary' : 'outline'}
            ctaLoading={ctaLoading}
            onCtaPress={onCtaPress}
            disabled={disabled}
          />
        );
      }),
    [
      activePlan,
      canPurchaseStore,
      connected,
      proPriceLabel,
      purchaseLoading,
      purchasePro,
      storeLoading,
    ],
  );

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: c.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + spacing[6] },
      ]}
      refreshControl={
        <RefreshControl refreshing={subscriptionLoading} onRefresh={() => void refetchSubscription()} />
      }
    >
      <Text style={[styles.lead, { color: c.textSecondary }]}>
        Choisissez l’offre adaptée à votre activité. L’abonnement Pro sur mobile est géré via{' '}
        {Platform.OS === 'ios' ? 'l’App Store' : 'Google Play'}.
      </Text>

      {subscriptionLoading && !subscription ? (
        <ActivityIndicator style={styles.loader} color={c.primary} />
      ) : (
        <View style={styles.cards}>{cards}</View>
      )}

      {isPro && billingLabel ? (
        <View style={[styles.statusCard, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
          <Text style={[styles.statusTitle, { color: c.textPrimary }]}>Abonnement actif</Text>
          <Text style={[styles.statusMeta, { color: c.textSecondary }]}>
            Source : {billingLabel}
          </Text>
          {subscription?.current_period_end ? (
            <Text style={[styles.statusMeta, { color: c.textSecondary }]}>
              Renouvellement :{' '}
              {new Date(subscription.current_period_end).toLocaleDateString('fr-FR')}
            </Text>
          ) : null}
          {(subscription?.billing_source === 'apple' ||
            subscription?.billing_source === 'google') && (
            <Button
              title="Gérer dans les réglages"
              variant="outline"
              size="sm"
              onPress={openManageSubscriptions}
              fullWidth
            />
          )}
        </View>
      ) : null}

      <Pressable onPress={() => void restore()} disabled={restoreLoading} style={styles.restore}>
        {restoreLoading ? (
          <ActivityIndicator color={c.primary} />
        ) : (
          <Text style={[styles.restoreText, { color: c.primary }]}>
            Restaurer mes achats
          </Text>
        )}
      </Pressable>

      <Text style={[styles.legal, { color: c.textTertiary }]}>
        Le paiement est débité sur votre compte {Platform.OS === 'ios' ? 'Apple' : 'Google'}.
        L’abonnement se renouvelle automatiquement sauf annulation au moins 24 h avant la fin de
        la période en cours.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    padding: spacing[4],
    gap: spacing[4],
  },
  lead: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  loader: { marginVertical: spacing[6] },
  cards: { gap: spacing[4] },
  statusCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing[4],
    gap: spacing[2],
  },
  statusTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
  },
  statusMeta: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
  },
  restore: {
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  restoreText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
  },
  legal: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
});

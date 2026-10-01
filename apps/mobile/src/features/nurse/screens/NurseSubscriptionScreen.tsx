import { NURSE_PLAN_LIST } from '@oneandlab/shared-constants';
import { useMemo } from 'react';
import { Linking, Platform, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SubscriptionPlanCard } from '@/features/nurse/components/SubscriptionPlanCard';
import { useNurseIap } from '@/features/nurse/hooks/use-nurse-iap';
import {
  getSubscriptionPriceParts,
  nurseProTrialFootnote,
} from '@/features/nurse/utils/subscription-price-display';
import type { AuthLegalSlug } from '@/features/auth/utils/open-legal-page';
import { webPageHref } from '@/features/legal/utils/web-page-href';
import { webAppUrl } from '@/config/env';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/skeletons';
import { Row } from '@/components/layout/primitives';
import { useToast } from '@/providers/ToastProvider';
import { H_PADDING, spacing, AppText, useStyles, type Theme } from '@/theme';

const IOS_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';
const ANDROID_SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions';
const STORE_NAME = Platform.OS === 'ios' ? 'l’App Store' : 'Google Play';

function billingSourceLabel(source: string | null | undefined): string | null {
  if (source === 'apple') return 'App Store';
  if (source === 'google') return 'Google Play';
  if (source === 'stripe') return 'site web';
  return null;
}

function manageSubscriptionsUrl(source?: string | null): string {
  if (source === 'stripe') return webAppUrl('/nurse/abonnement');
  if (source === 'apple') return IOS_SUBSCRIPTIONS_URL;
  if (source === 'google') return ANDROID_SUBSCRIPTIONS_URL;
  return Platform.OS === 'ios' ? IOS_SUBSCRIPTIONS_URL : ANDROID_SUBSCRIPTIONS_URL;
}

function activeSubscriptionLine(source: string | null | undefined, periodEnd: string | null | undefined): string | null {
  const label = billingSourceLabel(source);
  if (!label) return null;
  const end = periodEnd ? new Date(periodEnd).toLocaleDateString('fr-FR') : null;
  return end ? `Via ${label}, période en cours jusqu’au ${end}.` : `Via ${label}.`;
}

export function NurseSubscriptionScreen() {
  const styles = useStyles(buildStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { show: toast } = useToast();
  const {
    subscription,
    subscriptionLoading,
    subscriptionError,
    subscriptionErrorDetail,
    refetchSubscription,
    purchasePro,
    purchaseLoading,
    restore,
    restoreLoading,
    connected,
    storeLoading,
    localizedProPrice,
  } = useNurseIap();

  const openLegal = (slug: AuthLegalSlug) => {
    router.push(webPageHref('/(nurse)', { kind: 'legal', slug }));
  };

  const activePlan = subscription?.plan_slug ?? 'discovery';
  const isPro = activePlan === 'nurse_pro';
  const canPurchaseStore = subscription?.can_purchase_store !== false;
  const billingSource = subscription?.billing_source;
  const periodEnd = subscription?.current_period_end;

  const cards = useMemo(() => {
    const openManageSubscriptions = () => {
      const url = manageSubscriptionsUrl(billingSource);
      Linking.openURL(url).catch((error: unknown) => {
        console.warn('[subscription] ouverture de la gestion impossible', url, error);
        toast('Impossible d’ouvrir la gestion de l’abonnement, réessayez.', { type: 'error' });
      });
    };

    return NURSE_PLAN_LIST.map((plan) => {
      const isCurrent = plan.slug === activePlan;
      const isProPlan = plan.slug === 'nurse_pro';
      const storePrice = isProPlan ? localizedProPrice : null;
      const { amount, suffix } = getSubscriptionPriceParts(plan, storePrice);
      let ctaLabel: string | undefined;
      let onCtaPress: (() => void) | undefined;
      let ctaLoading = false;
      let disabled = false;
      let footnote: string | undefined;

      if (isProPlan) {
        footnote = nurseProTrialFootnote(plan, storePrice);
        if (isCurrent) {
          ctaLabel = 'Gérer mon abonnement';
          onCtaPress = openManageSubscriptions;
          footnote = activeSubscriptionLine(billingSource, periodEnd) ?? footnote;
        } else if (canPurchaseStore) {
          const storePending = connected && storeLoading;
          ctaLabel = !connected || storePending ? 'Chargement de la boutique…' : 'Passer en Pro';
          onCtaPress = purchasePro;
          ctaLoading = purchaseLoading || storeLoading;
          disabled = !connected || storePending || subscriptionLoading || subscriptionError || !subscription;
        } else {
          footnote = 'Votre abonnement se gère sur le site web Cary.';
        }
      } else if (!isCurrent) {
        footnote = 'Toujours disponible, sans carte bancaire.';
      }

      return (
        <SubscriptionPlanCard
          key={plan.slug}
          name={plan.name}
          priceAmount={amount}
          priceSuffix={suffix}
          tagline={plan.tagline}
          features={plan.features}
          footnote={footnote}
          recommended={plan.recommended}
          isCurrent={isCurrent}
          ctaLabel={ctaLabel}
          ctaVariant={isProPlan && !isCurrent ? 'primary' : 'outline'}
          ctaLoading={ctaLoading}
          onCtaPress={onCtaPress}
          disabled={disabled}
        />
      );
    });
  }, [
    activePlan,
    billingSource,
    canPurchaseStore,
    connected,
    localizedProPrice,
    periodEnd,
    purchaseLoading,
    purchasePro,
    storeLoading,
    subscription,
    subscriptionLoading,
    subscriptionError,
    toast,
  ]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[6] }]}
      refreshControl={
        <RefreshControl refreshing={subscriptionLoading} onRefresh={() => void refetchSubscription()} />
      }
    >
      <AppText variant="secondary">
        {isPro ? 'Merci pour votre confiance.' : `L’offre Pro se règle via ${STORE_NAME}.`}
      </AppText>

      {subscriptionError ? (
        <ErrorState
          title="Abonnement indisponible"
          error={subscriptionErrorDetail}
          onRetry={() => void refetchSubscription()}
        />
      ) : subscriptionLoading && !subscription ? (
        <SkeletonList count={2} itemHeight={280} gap={spacing[4]} />
      ) : (
        <View style={styles.cards}>{cards}</View>
      )}

      <Button
        title="Restaurer mes achats"
        variant="ghost"
        onPress={() => void restore()}
        loading={restoreLoading}
        fullWidth
      />

      <AppText variant="caption">
        Paiement débité sur votre compte {Platform.OS === 'ios' ? 'Apple' : 'Google'}. Renouvellement
        automatique sauf annulation au moins 24 h avant la fin de la période en cours.
      </AppText>

      <Row gap={spacing[2]} justify="center" wrap>
        <Button title="Conditions d’utilisation" variant="ghost" size="sm" onPress={() => openLegal('cgv')} />
        <Button title="Confidentialité" variant="ghost" size="sm" onPress={() => openLegal('confidentialite')} />
      </Row>
    </ScrollView>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    scroll: { minWidth: 0, flex: 1, backgroundColor: c.background },
    content: {
      paddingHorizontal: H_PADDING,
      paddingTop: spacing[4],
      gap: spacing[4],
    },
    cards: { gap: spacing[4] },
  };
}

import { api } from '@/api/client';
import { appDeepLink } from '@/config/brand';

export type StripeSubscription = {
  id?: string;
  plan_slug?: string;
  status?: string;
  trial_ends_at?: string | null;
  current_period_end?: string | null;
};

export async function fetchStripeSubscription() {
  return api.get<StripeSubscription | null>('/stripe/subscription');
}

export async function createCheckoutSession(planSlug = 'nurse_pro') {
  return api.post<{ url?: string }>('/stripe/create-checkout-session', {
    plan_slug: planSlug,
    success_url: appDeepLink('nurse/abonnement?success=1'),
    cancel_url: appDeepLink('nurse/abonnement'),
  });
}

export async function createPortalSession() {
  return api.post<{ url?: string }>('/stripe/create-portal-session', {
    return_url: appDeepLink('nurse/abonnement'),
  });
}

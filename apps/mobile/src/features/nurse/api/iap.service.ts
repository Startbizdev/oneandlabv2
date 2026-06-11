import { api } from '@/api/client';

export type IapBillingSource = 'stripe' | 'apple' | 'google' | null;

export type NurseIapSubscription = {
  plan_slug: 'discovery' | 'nurse_pro';
  status: string | null;
  billing_source: IapBillingSource;
  store_product_id?: string | null;
  current_period_end?: string | null;
  trial_ends_at?: string | null;
  manage_hint?: 'ios_settings' | 'play_store' | 'web_stripe' | null;
  can_purchase_store?: boolean;
  product_id?: string;
};

export async function fetchNurseIapSubscription() {
  return api.get<NurseIapSubscription>('/iap/subscription');
}

export async function verifyApplePurchase(payload: {
  transactionId?: string;
  signedTransaction?: string;
}) {
  return api.post<NurseIapSubscription>('/iap/apple/verify', payload);
}

export async function verifyGooglePurchase(payload: {
  productId: string;
  purchaseToken: string;
}) {
  return api.post<NurseIapSubscription>('/iap/google/verify', payload);
}

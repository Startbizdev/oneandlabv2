import { api } from '@/api/client';
import type {
  CreatePharmacyOrderPayload,
  PharmacyCatalogItem,
  PharmacyModuleUiFlags,
  PharmacyOrder,
  PharmacyOrderMessage,
  PharmacyOrderStatus,
} from '@oneandlab/shared-types';

export type PharmacyOrderMessagesResponse = {
  messages: PharmacyOrderMessage[];
  can_post: boolean;
};

export async function fetchPharmacyModuleFlags() {
  return api.get<PharmacyModuleUiFlags>('/pharmacy-module/config');
}

export async function fetchPharmacyCatalog(params: {
  postal_code?: string;
  fulfillment_mode?: string;
}) {
  const q = new URLSearchParams();
  if (params.postal_code?.trim()) q.set('postal_code', params.postal_code.trim());
  if (params.fulfillment_mode?.trim()) q.set('fulfillment_mode', params.fulfillment_mode.trim());
  const suffix = q.toString() ? `?${q.toString()}` : '';
  return api.get<PharmacyCatalogItem[]>(`/pharmacies${suffix}`);
}

export async function fetchPharmacyFavoriteIds() {
  return api.get<{ pharmacy_ids: string[] }>('/pharmacy-favorites');
}

export async function addPharmacyFavorite(pharmacyId: string) {
  return api.put<unknown>(`/pharmacy-favorites/${encodeURIComponent(pharmacyId)}`);
}

export async function removePharmacyFavorite(pharmacyId: string) {
  return api.delete<unknown>(`/pharmacy-favorites/${encodeURIComponent(pharmacyId)}`);
}

export async function fetchPharmacyOrders(scope: 'sent' | 'received' | 'patient' = 'sent') {
  return api.get<PharmacyOrder[]>(`/pharmacy-orders?scope=${encodeURIComponent(scope)}`);
}

export async function fetchPharmacyOrder(orderId: string) {
  return api.get<PharmacyOrder>(`/pharmacy-orders/${encodeURIComponent(orderId)}`);
}

export async function createPharmacyOrder(payload: CreatePharmacyOrderPayload) {
  return api.post<PharmacyOrder>('/pharmacy-orders', payload);
}

export async function updatePharmacyOrderStatus(
  orderId: string,
  status: PharmacyOrderStatus,
  patch?: { pharmacy_note?: string | null; rejection_reason?: string | null },
) {
  return api.patch<PharmacyOrder>(`/pharmacy-orders/${encodeURIComponent(orderId)}`, {
    status,
    ...patch,
  });
}

export async function fetchPharmacyOrderMessages(orderId: string) {
  return api.get<PharmacyOrderMessagesResponse>(
    `/pharmacy-orders/${encodeURIComponent(orderId)}/messages`,
  );
}

export async function postPharmacyOrderMessage(orderId: string, body: string) {
  return api.post<PharmacyOrderMessage>(
    `/pharmacy-orders/${encodeURIComponent(orderId)}/messages`,
    { body },
  );
}

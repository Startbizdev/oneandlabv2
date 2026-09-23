import type {
  CreatePharmacyOrderPayload,
  PharmacyCatalogItem,
  PharmacyModuleConfig,
  PharmacyModuleUiFlags,
  PharmacyOrder,
  PharmacyOrderMessage,
  PharmacyOrderStatus,
} from '@oneandlab/shared-types';
import { apiFetch } from '~/utils/api';

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  error?: string;
};

export type PharmacyAdminStats = {
  total: number;
  by_status: Record<string, number>;
  by_fulfillment_mode: Record<string, number>;
  from: string;
  to: string;
};

export type PharmacySentStats = {
  sent: number;
  completed: number;
  from: string;
  to: string;
};

export type PharmacyReceivedStats = {
  received: number;
  accepted: number;
  refused: number;
  acceptance_rate: number;
  from: string;
  to: string;
};

export type PharmacyOrderMessagesResponse = {
  messages: PharmacyOrderMessage[];
  can_post: boolean;
};

export function usePharmacyModule() {
  const uiFlags = useState<PharmacyModuleUiFlags | null>('pharmacy.module.uiFlags', () => null);
  const adminConfig = useState<PharmacyModuleConfig | null>('pharmacy.module.adminConfig', () => null);
  const loadingFlags = useState<boolean>('pharmacy.module.loadingFlags', () => false);

  async function fetchModuleFlags(): Promise<PharmacyModuleUiFlags | null> {
    loadingFlags.value = true;
    try {
      const res = (await apiFetch('/pharmacy-module/config', { method: 'GET' })) as ApiResponse<PharmacyModuleUiFlags>;
      if (!res?.success || !res.data) {
        throw new Error(res?.error || 'Configuration indisponible');
      }
      uiFlags.value = res.data;
      return res.data;
    } finally {
      loadingFlags.value = false;
    }
  }

  async function fetchAdminConfig(): Promise<PharmacyModuleConfig> {
    const res = (await apiFetch('/admin/pharmacy-module/config', { method: 'GET' })) as ApiResponse<PharmacyModuleConfig>;
    if (!res?.success || !res.data) {
      throw new Error(res?.error || 'Configuration admin indisponible');
    }
    adminConfig.value = res.data;
    return res.data;
  }

  async function saveAdminConfig(patch: Partial<PharmacyModuleConfig>): Promise<PharmacyModuleConfig> {
    const res = (await apiFetch('/admin/pharmacy-module/config', {
      method: 'PATCH',
      body: patch,
    })) as ApiResponse<PharmacyModuleConfig>;
    if (!res?.success || !res.data) {
      throw new Error(res?.error || 'Enregistrement impossible');
    }
    adminConfig.value = res.data;
    return res.data;
  }

  async function fetchOrders(scope: 'sent' | 'received' | 'patient' | 'all' = 'sent'): Promise<PharmacyOrder[]> {
    const qs = scope === 'sent' ? '' : `?scope=${encodeURIComponent(scope)}`;
    const res = (await apiFetch(`/pharmacy-orders${qs}`, { method: 'GET' })) as ApiResponse<PharmacyOrder[]>;
    if (!res?.success || !Array.isArray(res.data)) {
      throw new Error(res?.error || 'Chargement des commandes impossible');
    }
    return res.data;
  }

  async function fetchOrder(id: string): Promise<PharmacyOrder> {
    const res = (await apiFetch(`/pharmacy-orders/${encodeURIComponent(id)}`, { method: 'GET' })) as ApiResponse<PharmacyOrder>;
    if (!res?.success || !res.data) {
      throw new Error(res?.error || 'Commande introuvable');
    }
    return res.data;
  }

  async function createOrder(payload: CreatePharmacyOrderPayload): Promise<PharmacyOrder> {
    const res = (await apiFetch('/pharmacy-orders', {
      method: 'POST',
      body: payload,
    })) as ApiResponse<PharmacyOrder>;
    if (!res?.success || !res.data) {
      throw new Error(res?.error || 'Création impossible');
    }
    return res.data;
  }

  async function updateOrderStatus(
    id: string,
    status: PharmacyOrderStatus,
    patch: { pharmacy_note?: string | null; rejection_reason?: string | null } = {},
  ): Promise<PharmacyOrder> {
    const res = (await apiFetch(`/pharmacy-orders/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: { status, ...patch },
    })) as ApiResponse<PharmacyOrder>;
    if (!res?.success || !res.data) {
      throw new Error(res?.error || 'Mise à jour impossible');
    }
    return res.data;
  }

  async function fetchAdminStats(from?: string, to?: string): Promise<PharmacyAdminStats> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    const res = (await apiFetch(`/admin/pharmacy-orders/stats${qs ? `?${qs}` : ''}`, { method: 'GET' })) as ApiResponse<PharmacyAdminStats>;
    if (!res?.success || !res.data) {
      throw new Error(res?.error || 'Statistiques indisponibles');
    }
    return res.data;
  }

  async function fetchSentStats(from?: string, to?: string): Promise<PharmacySentStats> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    const res = (await apiFetch(`/pharmacy-orders/stats/sent${qs ? `?${qs}` : ''}`, { method: 'GET' })) as ApiResponse<PharmacySentStats>;
    if (!res?.success || !res.data) {
      throw new Error(res?.error || 'Statistiques indisponibles');
    }
    return res.data;
  }

  async function fetchReceivedStats(from?: string, to?: string): Promise<PharmacyReceivedStats> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    const res = (await apiFetch(`/pharmacy-orders/stats/received${qs ? `?${qs}` : ''}`, { method: 'GET' })) as ApiResponse<PharmacyReceivedStats>;
    if (!res?.success || !res.data) {
      throw new Error(res?.error || 'Statistiques indisponibles');
    }
    return res.data;
  }

  async function fetchPharmacies(postalCode?: string, fulfillmentMode?: string): Promise<PharmacyCatalogItem[]> {
    const params = new URLSearchParams();
    if (postalCode?.trim()) params.set('postal_code', postalCode.trim());
    if (fulfillmentMode) params.set('fulfillment_mode', fulfillmentMode);
    const qs = params.toString();
    const res = (await apiFetch(`/pharmacies${qs ? `?${qs}` : ''}`, { method: 'GET' })) as ApiResponse<PharmacyCatalogItem[]>;
    if (!res?.success || !Array.isArray(res.data)) {
      throw new Error(res?.error || 'Catalogue pharmacie indisponible');
    }
    return res.data;
  }

  async function fetchMessages(orderId: string): Promise<PharmacyOrderMessagesResponse> {
    const res = (await apiFetch(`/pharmacy-orders/${encodeURIComponent(orderId)}/messages`, {
      method: 'GET',
    })) as ApiResponse<PharmacyOrderMessagesResponse>;
    if (!res?.success || !res.data) {
      throw new Error(res?.error || 'Messages indisponibles');
    }
    return res.data;
  }

  async function postMessage(orderId: string, body: string): Promise<PharmacyOrderMessage> {
    const res = (await apiFetch(`/pharmacy-orders/${encodeURIComponent(orderId)}/messages`, {
      method: 'POST',
      body: { body },
    })) as ApiResponse<PharmacyOrderMessage>;
    if (!res?.success || !res.data) {
      throw new Error(res?.error || 'Envoi impossible');
    }
    return res.data;
  }

  return {
    uiFlags,
    adminConfig,
    loadingFlags,
    fetchModuleFlags,
    fetchAdminConfig,
    saveAdminConfig,
    fetchOrders,
    fetchOrder,
    createOrder,
    updateOrderStatus,
    fetchAdminStats,
    fetchSentStats,
    fetchReceivedStats,
    fetchPharmacies,
    fetchMessages,
    postMessage,
  };
}

/**
 * Composable pour le tableau de bord dispatch admin
 */

import type {
  AdminDispatchDashboardData,
  AdminDispatchDetail,
} from '@oneandlab/shared-types';
import { apiFetch } from '~/utils/api';

export interface AdminDispatchFilters {
  type?: string;
  status?: string;
  dispatch_mode?: string;
  date_from?: string;
  date_to?: string;
  created_from?: string;
  created_to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useAdminDispatch() {
  const dashboardData = useState<AdminDispatchDashboardData | null>('admin.dispatch.data', () => null);
  const detailData = useState<AdminDispatchDetail | null>('admin.dispatch.detail', () => null);
  const loading = useState<boolean>('admin.dispatch.loading', () => false);
  const detailLoading = useState<boolean>('admin.dispatch.detailLoading', () => false);
  const error = useState<string | null>('admin.dispatch.error', () => null);
  const detailError = useState<string | null>('admin.dispatch.detailError', () => null);

  const fetchDashboard = async (filters: AdminDispatchFilters = {}) => {
    loading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (filters.type) params.set('type', filters.type);
      if (filters.status) params.set('status', filters.status);
      if (filters.dispatch_mode) params.set('dispatch_mode', filters.dispatch_mode);
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to) params.set('date_to', filters.date_to);
      if (filters.created_from) params.set('created_from', filters.created_from);
      if (filters.created_to) params.set('created_to', filters.created_to);
      if (filters.search) params.set('search', filters.search);
      params.set('page', String(filters.page ?? 1));
      params.set('limit', String(filters.limit ?? 25));

      const qs = params.toString();
      const response = await apiFetch<{ success: boolean; data: AdminDispatchDashboardData; error?: string }>(
        `/admin/dispatch${qs ? `?${qs}` : ''}`,
        { method: 'GET' },
      );
      if (response.success && response.data) {
        dashboardData.value = response.data;
      } else {
        error.value = response.error || 'Erreur lors du chargement du dispatch';
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Erreur réseau';
    } finally {
      loading.value = false;
    }
  };

  const fetchDetail = async (appointmentId: string) => {
    detailLoading.value = true;
    detailError.value = null;
    try {
      const response = await apiFetch<{ success: boolean; data: AdminDispatchDetail; error?: string }>(
        `/admin/dispatch/${encodeURIComponent(appointmentId)}`,
        { method: 'GET' },
      );
      if (response.success && response.data) {
        detailData.value = response.data;
      } else {
        detailError.value = response.error || 'Erreur lors du chargement du détail';
      }
    } catch (err: unknown) {
      detailError.value = err instanceof Error ? err.message : 'Erreur réseau';
    } finally {
      detailLoading.value = false;
    }
  };

  const clearDetail = () => {
    detailData.value = null;
    detailError.value = null;
  };

  return {
    dashboardData,
    detailData,
    loading,
    detailLoading,
    error,
    detailError,
    fetchDashboard,
    fetchDetail,
    clearDetail,
  };
}

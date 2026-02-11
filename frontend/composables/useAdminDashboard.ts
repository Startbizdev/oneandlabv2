/**
 * Composable pour le tableau de bord administrateur
 * Récupère les statistiques globales (utilisateurs, RDV, inscriptions)
 */

import { apiFetch } from '~/utils/api';

export interface UsersByRole {
  patient: number;
  nurse: number;
  lab: number;
  subaccount: number;
  preleveur: number;
  pro: number;
  super_admin: number;
  total: number;
}

export interface AppointmentsByStatus {
  pending: number;
  confirmed: number;
  inProgress: number;
  completed: number;
  canceled: number;
  refused?: number;
  total: number;
}

export interface ActivityLogEntry {
  id: string;
  user_id: string | null;
  role: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  created_at: string;
}

export interface ProfileUpdateEntry {
  id: string;
  role: string;
  updated_at: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface AdminDashboardData {
  usersByRole: UsersByRole;
  appointmentsByStatus: AppointmentsByStatus;
  registrationRequestsPending: number;
  lastUsers: Array<{
    id: string;
    role: string;
    first_name: string;
    last_name: string;
    email: string;
    created_at?: string;
    company_name?: string;
  }>;
  lastAppointments: Array<{
    id: string;
    type: string;
    status: string;
    scheduled_at: string;
    form_data?: Record<string, unknown>;
    category_name?: string;
  }>;
  lastActivityLogs?: ActivityLogEntry[];
  lastProfileUpdates?: ProfileUpdateEntry[];
}

export function useAdminDashboard() {
  const data = useState<AdminDashboardData | null>('admin.dashboard.data', () => null);
  const loading = useState<boolean>('admin.dashboard.loading', () => false);
  const error = useState<string | null>('admin.dashboard.error', () => null);

  const fetchDashboard = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiFetch<{ success: boolean; data: AdminDashboardData }>('/admin/stats', {
        method: 'GET',
      });
      if (response.success && response.data) {
        data.value = response.data;
      } else {
        error.value = (response as any).error || 'Erreur lors du chargement des statistiques';
      }
    } catch (err: any) {
      error.value = err.message || 'Erreur réseau';
    } finally {
      loading.value = false;
    }
  };

  return {
    data,
    loading,
    error,
    fetchDashboard,
  };
}

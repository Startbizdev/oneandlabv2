import { api } from '@/api/client';

export type RegisterRole = 'patient' | 'nurse' | 'pro';

export interface RegistrationRequestPayload {
  role: 'nurse' | 'pro';
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  rpps?: string;
  adeli?: string;
  gender?: string;
  emploi?: string;
}

export async function submitRegistrationRequest(body: RegistrationRequestPayload) {
  return api.post<{ id: string }>('/registration-requests', body);
}

export interface GuestToUserPayload {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  birth_date?: string;
  gender?: string;
  address?: {
    label: string;
    lat?: number;
    lng?: number;
    street?: string;
    city?: string;
    postcode?: string;
  };
}

export async function guestToUser(body: GuestToUserPayload | { email: string }) {
  return api.post<{
    user_id: string;
    session_id?: string;
    action?: 'login' | 'create';
  }>('/auth/guest-to-user', body);
}

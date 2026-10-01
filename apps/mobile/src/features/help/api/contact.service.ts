import { api } from '@/api/client';
import { getContactClientInfo } from '../utils/app-meta';

export type ContactSupportPayload = {
  name: string;
  email: string;
  contactType: string;
  message: string;
};

export async function submitContactForm(payload: ContactSupportPayload) {
  return api.post<{ message?: string }>('/contact', { ...payload, client: getContactClientInfo() });
}

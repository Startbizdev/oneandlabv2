import { api } from '@/api/client';

export type ContactSupportPayload = {
  name: string;
  email: string;
  contactType: string;
  message: string;
  context?: Record<string, string>;
};

export async function submitContactForm(payload: ContactSupportPayload) {
  return api.post<{ message?: string }>('/contact', payload);
}

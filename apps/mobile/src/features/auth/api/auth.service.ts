import { api } from '@/api/client';
import type { ApiResponse } from '@oneandlab/shared-api';
import type { AuthUser } from '@oneandlab/shared-types';

export type CheckEmailResult = ApiResponse<{ exists: boolean; role?: string; has_password?: boolean }> & {
  exists?: boolean;
  role?: string;
  has_password?: boolean;
};

export async function checkEmail(email: string) {
  return api.post<{ exists: boolean; role?: string; has_password?: boolean }>('/auth/check-email', {
    email,
  }) as Promise<CheckEmailResult>;
}

export type RequestOtpResult = ApiResponse<{ user_id: string; session_id?: string; otp?: string }> & {
  user_id?: string;
  session_id?: string;
  otp?: string;
};

export async function requestOtp(email: string): Promise<RequestOtpResult> {
  return api.post('/auth/request-otp', { email }) as Promise<RequestOtpResult>;
}

export function parseRequestOtpResponse(res: RequestOtpResult) {
  return {
    userId: res.user_id ?? res.data?.user_id,
    sessionId: res.session_id ?? res.data?.session_id,
    otp: res.otp ?? res.data?.otp,
  };
}

type VerifyOtpResponse = ApiResponse<AuthUser> & {
  token?: string;
  user?: AuthUser;
};

export async function verifyOtp(userId: string, otp: string, sessionId?: string) {
  const cleanOTP = String(otp).replace(/[^0-9]/g, '').trim();
  return api.post<AuthUser>('/auth/verify-otp', {
    user_id: String(userId),
    otp: cleanOTP,
    ...(sessionId ? { session_id: String(sessionId) } : {}),
  }) as Promise<VerifyOtpResponse>;
}

type LoginPasswordResponse = ApiResponse<AuthUser> & {
  token?: string;
  user?: AuthUser;
  must_change_password?: boolean;
};

export async function loginWithPassword(email: string, password: string) {
  return api.post<AuthUser>('/auth/login', { email, password }) as Promise<LoginPasswordResponse>;
}

export async function forgotPassword(email: string) {
  return api.post('/auth/password/forgot', { email });
}

export async function resetPassword(body: {
  new_password: string;
  confirm_password: string;
  token?: string;
  code?: string;
  email?: string;
}) {
  return api.post('/auth/password/reset', body);
}

export async function updatePassword(body: {
  new_password: string;
  confirm_password: string;
  current_password?: string;
}) {
  return api.put('/auth/password', body);
}

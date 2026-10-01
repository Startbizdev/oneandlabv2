import axios, { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { apiRequest } from '../../api/client';
import { setAuthToken } from '../auth-token';
import {
  SESSION_EXPIRED_MESSAGE,
  isSessionExpiryResponse,
  notifySessionExpired,
  setSessionExpiredHandler,
} from '../auth/session-expiry';
import { ApiRequestError } from '../errors/api-request-error';

jest.mock('../../config/env', () => ({
  getApiBase: () => 'https://api.test',
  isDevBuild: () => false,
}));

function httpError(status: number, data: Record<string, unknown>): AxiosError {
  const config = { headers: new AxiosHeaders() };
  const response: AxiosResponse = { status, statusText: '', headers: {}, config, data };
  return new AxiosError(`HTTP ${status}`, 'ERR_BAD_RESPONSE', config, null, response);
}

const unauthorized = { success: false, error: 'Token invalide', code: 'UNAUTHORIZED' };

describe('isSessionExpiryResponse', () => {
  it('detects a 401 UNAUTHORIZED', () => {
    expect(isSessionExpiryResponse('/appointments', 401, 'UNAUTHORIZED')).toBe(true);
  });

  it('ignores a 500 (database down during authentication)', () => {
    expect(isSessionExpiryResponse('/auth/me?scope=mobile', 500, 'SERVER_ERROR')).toBe(false);
  });

  it('ignores a 401 without the UNAUTHORIZED code', () => {
    expect(isSessionExpiryResponse('/appointments', 401, undefined)).toBe(false);
  });

  it('ignores login, logout and OTP routes', () => {
    for (const path of ['/auth/login', '/auth/logout', '/auth/request-otp', '/auth/verify-otp']) {
      expect(isSessionExpiryResponse(path, 401, 'UNAUTHORIZED')).toBe(false);
    }
  });
});

describe('apiRequest on an expired session', () => {
  let clearSession: jest.Mock<Promise<void>, []>;

  beforeEach(() => {
    setAuthToken('t1');
    clearSession = jest.fn(async () => {
      setAuthToken(null);
    });
    setSessionExpiredHandler(clearSession);
    jest.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: { csrf_token: 'csrf' } } });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    setSessionExpiredHandler(null);
    setAuthToken(null);
  });

  it('clears the session once when parallel requests get a 401', async () => {
    clearSession.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            setAuthToken(null);
            resolve();
          }, 0);
        }),
    );
    jest.spyOn(axios, 'request').mockRejectedValue(httpError(401, unauthorized));

    const results = await Promise.allSettled([apiRequest('/appointments'), apiRequest('/notifications')]);
    await notifySessionExpired('t1');

    expect(clearSession).toHaveBeenCalledTimes(1);
    for (const result of results) {
      expect(result.status).toBe('rejected');
      if (result.status === 'rejected') {
        expect(result.reason).toBeInstanceOf(ApiRequestError);
        expect(result.reason.message).toBe(SESSION_EXPIRED_MESSAGE);
        expect(result.reason.status).toBe(401);
      }
    }
  });

  it('ignores a late 401 from a session already replaced', async () => {
    jest.spyOn(axios, 'request').mockImplementation(async () => {
      setAuthToken('t2');
      throw httpError(401, unauthorized);
    });

    await expect(apiRequest('/appointments')).rejects.toMatchObject({ status: 401 });
    expect(clearSession).not.toHaveBeenCalled();
  });

  it('ignores a 401 on a request sent without a session', async () => {
    setAuthToken(null);
    jest.spyOn(axios, 'request').mockRejectedValue(httpError(401, unauthorized));

    await expect(apiRequest('/appointments')).rejects.toMatchObject({ message: 'Token invalide', status: 401 });
    expect(clearSession).not.toHaveBeenCalled();
  });

  it('does not clear the session on a 500', async () => {
    jest
      .spyOn(axios, 'request')
      .mockRejectedValue(httpError(500, { success: false, error: 'Erreur serveur', code: 'SERVER_ERROR' }));

    await expect(apiRequest('/auth/me?scope=mobile')).rejects.toMatchObject({ status: 500, code: 'SERVER_ERROR' });
    expect(clearSession).not.toHaveBeenCalled();
  });

  it('does not clear the session when logout itself answers 401', async () => {
    jest.spyOn(axios, 'request').mockRejectedValue(httpError(401, unauthorized));

    await expect(apiRequest('/auth/logout', { method: 'POST' })).rejects.toMatchObject({ status: 401 });
    expect(clearSession).not.toHaveBeenCalled();
  });

  it('surfaces business error codes with the server message', async () => {
    jest.spyOn(axios, 'request').mockRejectedValue(
      httpError(409, {
        success: false,
        error: 'Impossible de supprimer : rendez-vous en attente ou en cours pour ce patient',
        code: 'PATIENT_HAS_ACTIVE_APPOINTMENTS',
      }),
    );

    await expect(apiRequest('/patients/p1', { method: 'DELETE' })).rejects.toMatchObject({
      message: 'Impossible de supprimer : rendez-vous en attente ou en cours pour ce patient',
      status: 409,
      code: 'PATIENT_HAS_ACTIVE_APPOINTMENTS',
    });
    expect(clearSession).not.toHaveBeenCalled();
  });
});

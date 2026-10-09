import axios, { AxiosHeaders, type AxiosResponse } from 'axios';
import { INVALID_API_RESPONSE_MESSAGE, apiRequest } from '../../api/client';
import { setAuthToken } from '../auth-token';
import { ApiRequestError } from '../errors/api-request-error';

jest.mock('../../config/env', () => ({
  getApiBase: () => 'https://api.test',
  isDevBuild: () => false,
}));

function okResponse(data: unknown): AxiosResponse {
  return { status: 200, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() }, data };
}

const PHP_WARNING_BODY =
  '<br />\n<b>Warning</b>:  Undefined array key "k" in <b>/app/backend/api/ai/conversations/index.php</b><br />\n{"success":true,"data":[]}';

describe('apiRequest with a 2xx body that is not JSON', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    setAuthToken('t1');
    jest.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: { csrf_token: 'csrf' } } });
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    setAuthToken(null);
  });

  it('throws an explicit error instead of handing raw text to the caller (PHP warning printed in 200)', async () => {
    jest.spyOn(axios, 'request').mockResolvedValue(okResponse(PHP_WARNING_BODY));

    const result = apiRequest('/ai/conversations', { method: 'POST', body: { conversation_type: 'general' } });

    await expect(result).rejects.toBeInstanceOf(ApiRequestError);
    await expect(result).rejects.toMatchObject({
      message: INVALID_API_RESPONSE_MESSAGE,
      status: 200,
      code: 'INVALID_API_RESPONSE',
    });
    expect(warn).toHaveBeenCalledWith('[api] réponse non JSON 200 /ai/conversations', expect.stringContaining('Warning'));
  });

  it('returns the JSON envelope unchanged', async () => {
    const envelope = { success: true, data: [{ id: 'c1' }] };
    jest.spyOn(axios, 'request').mockResolvedValue(okResponse(envelope));

    await expect(apiRequest('/ai/conversations')).resolves.toEqual(envelope);
  });
});

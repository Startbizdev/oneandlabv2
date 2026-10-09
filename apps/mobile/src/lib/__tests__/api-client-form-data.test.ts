import axios, { AxiosHeaders } from 'axios';
import { api } from '../../api/client';
import { setAuthToken } from '../auth-token';

jest.mock('../../config/env', () => ({
  getApiBase: () => 'https://api.test',
  isDevBuild: () => false,
}));

describe('api.postForm', () => {
  beforeEach(() => {
    setAuthToken('t1');
    jest.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: { csrf_token: 'csrf' } } });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    setAuthToken(null);
  });

  it('sends the body as multipart: Android rejects a multipart body typed x-www-form-urlencoded', async () => {
    const request = jest.spyOn(axios, 'request').mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: { success: true, data: { id: 'd2' } },
    });
    const form = new FormData();
    form.append('document_type', 'prescription');

    await api.postForm('/medical-documents/d1/replace', form);

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        data: form,
        headers: expect.objectContaining({ 'Content-Type': 'multipart/form-data', 'X-CSRF-Token': 'csrf' }),
      }),
    );
  });
});

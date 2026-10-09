import type { CreatePharmacyOrderPayload } from '@oneandlab/shared-types';
import { PharmacyOrderCreationAttempt } from '../../features/pharmacy-orders/utils/pharmacy-order-creation-attempt';

const fields = {
  patient_id: 'patient-1',
  relative_id: null,
  pharmacy_id: 'pharmacy-1',
  fulfillment_mode: 'click_collect' as const,
  delivery_address: null,
  desired_fulfillment_date: '2026-10-07',
  requester_comment: null,
};

function setup() {
  let next = 0;
  const attempt = new PharmacyOrderCreationAttempt(() => `request-id-${++next}-000000000`);
  const upload = jest.fn(async () => ['doc-1']);
  const sent: CreatePharmacyOrderPayload[] = [];
  const failOnce = { value: false };
  const create = async (payload: CreatePharmacyOrderPayload) => {
    sent.push(payload);
    if (failOnce.value) {
      failOnce.value = false;
      throw new Error('Réseau indisponible');
    }
    return { id: 'order-1' };
  };
  return { attempt, upload, sent, failOnce, create };
}

describe('PharmacyOrderCreationAttempt', () => {
  it('retries a lost send with the same key and without uploading the pages again', async () => {
    const { attempt, upload, sent, failOnce, create } = setup();
    failOnce.value = true;

    await expect(attempt.run(['page-a'], upload, fields, create)).rejects.toThrow('Réseau indisponible');
    await attempt.run(['page-a'], upload, fields, create);

    expect(upload).toHaveBeenCalledTimes(1);
    expect(sent).toHaveLength(2);
    expect(sent[0]).toEqual({ ...fields, prescription_document_ids: ['doc-1'], client_request_id: 'request-id-1-000000000' });
    expect(sent[1].client_request_id).toBe(sent[0].client_request_id);
  });

  it('uses a new key when the order content changes', async () => {
    const { attempt, upload, sent, create } = setup();

    await attempt.run(['page-a'], upload, fields, create);
    await attempt.run(['page-a'], upload, { ...fields, requester_comment: 'Boîte de 30' }, create);

    expect(upload).toHaveBeenCalledTimes(1);
    expect(sent[1].client_request_id).not.toBe(sent[0].client_request_id);
  });

  it('uploads again and changes the key when the pages change', async () => {
    const { attempt, upload, sent, create } = setup();
    upload.mockResolvedValueOnce(['doc-1']).mockResolvedValueOnce(['doc-2']);

    await attempt.run(['page-a'], upload, fields, create);
    await attempt.run(['page-b'], upload, fields, create);

    expect(upload).toHaveBeenCalledTimes(2);
    expect(sent[1].prescription_document_ids).toEqual(['doc-2']);
    expect(sent[1].client_request_id).not.toBe(sent[0].client_request_id);
  });
});

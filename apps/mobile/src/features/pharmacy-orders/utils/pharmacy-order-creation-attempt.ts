import type { CreatePharmacyOrderPayload } from '@oneandlab/shared-types';

type OrderFields = Omit<CreatePharmacyOrderPayload, 'prescription_document_ids' | 'client_request_id'>;

/**
 * Envoi rejouable d'une commande pharmacie dans l'écran monté : les pages déjà téléversées sont réutilisées
 * et la même demande garde son `client_request_id`, donc une réponse perdue ne crée jamais de doublon.
 */
export class PharmacyOrderCreationAttempt {
  private uploaded: { key: string; ids: string[] } | null = null;
  private request: { key: string; id: string } | null = null;
  private readonly newRequestId: () => string;

  constructor(newRequestId: () => string) {
    this.newRequestId = newRequestId;
  }

  async run<Result>(
    pages: unknown,
    upload: () => Promise<string[]>,
    fields: OrderFields,
    create: (payload: CreatePharmacyOrderPayload) => Promise<Result>,
  ): Promise<Result> {
    const pagesKey = JSON.stringify(pages);
    if (this.uploaded?.key !== pagesKey) this.uploaded = { key: pagesKey, ids: await upload() };
    const payload = { ...fields, prescription_document_ids: this.uploaded.ids };
    const requestKey = JSON.stringify(payload);
    if (this.request?.key !== requestKey) this.request = { key: requestKey, id: this.newRequestId() };
    return create({ ...payload, client_request_id: this.request.id });
  }
}

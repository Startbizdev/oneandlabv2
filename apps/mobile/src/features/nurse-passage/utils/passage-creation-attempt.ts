import type { createNursePassageSeries } from '../api/nurse-passage.service';

type Input = Parameters<typeof createNursePassageSeries>[0];
type Result = Awaited<ReturnType<typeof createNursePassageSeries>>;

/**
 * Keep an acknowledged series while retrying its prescription in this mounted screen.
 * The same demand always reuses its `client_request_id`, so a retry after a lost response never duplicates the series.
 */
export class PassageCreationAttempt {
  private pending: { key: string; result: Result } | null = null;
  private request: { key: string; id: string } | null = null;
  private busy = false;
  private readonly newRequestId: () => string;

  constructor(newRequestId: () => string) {
    this.newRequestId = newRequestId;
  }

  async run(input: Input, create: (input: Input) => Promise<Result>, attach: (result: Result) => Promise<void>): Promise<Result> {
    if (this.busy) throw new Error('Enregistrement déjà en cours.');
    const key = JSON.stringify(input);
    if (this.pending && this.pending.key !== key) {
      throw new Error('Les passages sont déjà créés. Reprenez la demande sans modifier les informations, ou ouvrez votre tournée.');
    }
    if (this.request?.key !== key) this.request = { key, id: this.newRequestId() };
    const clientRequestId = this.request.id;
    this.busy = true;
    try {
      if (!this.pending) this.pending = { key, result: await create({ ...input, client_request_id: clientRequestId }) };
      const result = this.pending.result;
      await attach(result);
      this.pending = null;
      this.request = null;
      return result;
    } catch (error) {
      if (this.pending) {
        throw new Error(`${error instanceof Error ? error.message : 'Pièce jointe non enregistrée.'} Les passages sont créés. Réessayez sans modifier la demande pour terminer l’envoi.`);
      }
      throw error;
    } finally {
      this.busy = false;
    }
  }
}

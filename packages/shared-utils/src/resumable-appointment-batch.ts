export function createAppointmentRequestId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const value = Math.floor(Math.random() * 16);
    return (c === 'x' ? value : (value & 3) | 8).toString(16);
  });
}

/** Keep request keys across network retries; the server persists their resulting IDs. */
export class ResumableAppointmentBatch<T> {
  private key: string | null = null;
  private payloads: T[] = [];
  private ids: string[] = [];
  private attached = new Set<string>();
  private completedArtifacts = new Set<string>();
  private busy = false;
  private requestIds: string[] = [];

  async completeOnce(key: string, operation: () => Promise<void>): Promise<void> {
    if (this.completedArtifacts.has(key)) return;
    await operation();
    this.completedArtifacts.add(key);
  }

  async run(
    key: string,
    payloads: T[],
    create: (payload: T, requestId: string) => Promise<string>,
    attach: (payload: T, id: string) => Promise<void>,
  ): Promise<{ success: boolean; createdIds: string[]; error?: string }> {
    if (this.busy) return { success: false, createdIds: [...this.ids], error: 'Création déjà en cours.' };
    if (this.key !== key && this.ids.length) {
      return { success: false, createdIds: [...this.ids], error: 'Une partie des rendez-vous est déjà créée. Consultez votre liste avant de modifier cette demande.' };
    }
    if (this.key !== key) {
      this.key = key;
      this.payloads = payloads;
      this.requestIds = payloads.map(() => createAppointmentRequestId());
    }
    this.busy = true;
    let failure: unknown;
    try {
      for (let i = this.ids.length; i < this.payloads.length; i++) {
        this.ids.push(await create(this.payloads[i], this.requestIds[i]));
      }
    } catch (error) {
      failure = error;
    }
    try {
      // Even after partial creation, attach documents to the appointments that exist.
      for (let i = 0; i < this.ids.length; i++) {
        if (this.attached.has(this.ids[i])) continue;
        await attach(this.payloads[i], this.ids[i]);
        this.attached.add(this.ids[i]);
      }
      if (failure) throw failure;
      const createdIds = [...this.ids];
      this.key = null;
      this.payloads = [];
      this.requestIds = [];
      this.ids = [];
      this.attached.clear();
      this.completedArtifacts.clear();
      return { success: true, createdIds };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Création impossible.';
      return { success: false, createdIds: [...this.ids], error: this.ids.length
        ? `${message} ${this.ids.length}/${this.payloads.length} rendez-vous créés. Réessayez sans modifier le formulaire pour reprendre la demande.`
        : message };
    } finally {
      this.busy = false;
    }
  }
}

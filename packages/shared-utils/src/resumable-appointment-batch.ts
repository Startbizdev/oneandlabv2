export function createAppointmentRequestId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const value = Math.floor(Math.random() * 16);
    return (c === 'x' ? value : (value & 3) | 8).toString(16);
  });
}

export type ResumableAppointmentBatchRunOptions = {
  /** false : renvoyer les ids dès la création, documents en arrière-plan. */
  waitForAttach?: boolean;
};

/** Keep request keys across network retries; the server persists their resulting IDs. */
export class ResumableAppointmentBatch<T> {
  private key: string | null = null;
  private payloads: T[] = [];
  private ids: string[] = [];
  private attached = new Set<string>();
  private completedArtifacts = new Set<string>();
  private busy = false;
  private requestIds: string[] = [];
  private backgroundAttach: Promise<void> | null = null;

  isBusy(): boolean {
    return this.busy;
  }

  peekCreatedIds(): string[] {
    return [...this.ids];
  }

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
    options?: ResumableAppointmentBatchRunOptions,
  ): Promise<{ success: boolean; createdIds: string[]; error?: string; creationComplete?: boolean }> {
    const waitForAttach = options?.waitForAttach !== false;
    if (this.busy) {
      return { success: false, createdIds: [...this.ids], error: 'Création déjà en cours.' };
    }
    if (this.key !== key && this.ids.length) {
      return {
        success: false,
        createdIds: [...this.ids],
        error: 'Une partie des rendez-vous est déjà créée. Consultez votre liste avant de modifier cette demande.',
      };
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

    if (!waitForAttach) {
      return this.finishWithoutWaitingForAttach(attach, failure);
    }

    try {
      await this.attachRemaining(attach);
      if (failure) throw failure;
      const createdIds = [...this.ids];
      this.resetBatch();
      return { success: true, createdIds };
    } catch (error) {
      return this.failureResult(error);
    } finally {
      this.busy = false;
    }
  }

  private finishWithoutWaitingForAttach(
    attach: (payload: T, id: string) => Promise<void>,
    failure: unknown,
  ): { success: boolean; createdIds: string[]; error?: string; creationComplete?: boolean } {
    const createdIds = [...this.ids];
    const creationComplete = this.payloads.length > 0 && this.ids.length === this.payloads.length;
    this.backgroundAttach = this.attachRemaining(attach).catch(() => undefined);
    this.busy = false;

    if (createdIds.length > 0 && !failure) {
      return { success: true, createdIds };
    }
    if (createdIds.length > 0) {
      const message = failure instanceof Error ? failure.message : 'Création impossible.';
      return {
        success: false,
        createdIds,
        creationComplete,
        error: creationComplete
          ? `${message} Le rendez-vous est créé, mais certains documents n’ont pas pu être rattachés.`
          : `${message} ${this.ids.length}/${this.payloads.length} rendez-vous créés. Réessayez sans modifier le formulaire pour reprendre la demande.`,
      };
    }
    const message = failure instanceof Error ? failure.message : 'Création impossible.';
    return { success: false, createdIds: [], error: message };
  }

  private async attachRemaining(attach: (payload: T, id: string) => Promise<void>): Promise<void> {
    for (let i = 0; i < this.ids.length; i++) {
      if (this.attached.has(this.ids[i])) continue;
      await attach(this.payloads[i], this.ids[i]);
      this.attached.add(this.ids[i]);
    }
  }

  private failureResult(error: unknown): {
    success: boolean;
    createdIds: string[];
    error?: string;
    creationComplete?: boolean;
  } {
    const message = error instanceof Error ? error.message : 'Création impossible.';
    const creationComplete = this.payloads.length > 0 && this.ids.length === this.payloads.length;
    return {
      success: false,
      createdIds: [...this.ids],
      creationComplete,
      error: this.ids.length
        ? creationComplete
          ? `${message} Le rendez-vous est créé, mais certains documents n’ont pas pu être rattachés.`
          : `${message} ${this.ids.length}/${this.payloads.length} rendez-vous créés. Réessayez sans modifier le formulaire pour reprendre la demande.`
        : message,
    };
  }

  private resetBatch(): void {
    this.key = null;
    this.payloads = [];
    this.requestIds = [];
    this.ids = [];
    this.attached.clear();
    this.completedArtifacts.clear();
    this.backgroundAttach = null;
  }
}

/** Échec HTTP : `status` est null quand le serveur n'a pas répondu (réseau, délai). */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly code?: string,
    /** Dossier déjà porteur de l'e-mail (409 `EMAIL_ALREADY_USED` de `POST /patients`). */
    readonly existingPatientId?: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

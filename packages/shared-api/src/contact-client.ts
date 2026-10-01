/**
 * Champ optionnel `client` de `POST /contact` : contexte technique déclaré par l'application,
 * non vérifié par le serveur (`ContactInquiry::clientRows` ne garde que ces clés au format attendu).
 */
export type ContactClientPlatform = 'ios' | 'android' | 'web';

export interface ContactClientInfo {
  platform: ContactClientPlatform;
  app_version?: string;
  build?: string;
  device_model?: string;
}

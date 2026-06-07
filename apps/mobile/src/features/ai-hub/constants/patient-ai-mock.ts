/** Suggestions rapides hub IA patient — aligné plan Module 5 § 05.12 (mockup). */
export type PatientAiQuickSuggestion = {
  id: string;
  label: string;
};

export const PATIENT_AI_QUICK_SUGGESTIONS: PatientAiQuickSuggestion[] = [
  { id: 'book', label: 'Prendre un rendez-vous' },
  { id: 'lab_results', label: 'Explique mes derniers résultats' },
  { id: 'dossier', label: 'Résumer mon dossier' },
  { id: 'next_rdv', label: 'Préparer mon prochain RDV' },
  { id: 'documents', label: 'Résumer mes documents récents' },
  { id: 'health_trends', label: 'Montre mes tendances santé' },
];

/** Réponses mock quand Cary n’est pas encore branché — ton humain, léger. */
export const PATIENT_AI_MOCK_REPLIES = [
  "Question reçue ! Petite précision : mon cerveau est encore en installation. Revenez bientôt — d’ici là, vos RDV et documents, eux, savent déjà quoi faire.",
  "J’ai lu votre message deux fois pour faire sérieux. Verdict : je ne suis pas encore prêt, mais j’y travaille. En attendant, promis, je ne touche pas à vos résultats sans vous.",
  "Là, honnêtement, je fais surtout semblant de réfléchir très fort. Cary arrive pour de vrai bientôt — en attendant, tout le reste de l’app fonctionne sans moi (et c’est tant mieux).",
  "Bonne question ! Mauvaise nouvelle : je suis encore en mode « bientôt disponible ». Bonne nouvelle : prendre un RDV ou consulter vos docs, ça marche déjà très bien.",
  "Merci pour votre confiance — je la mérite à moitié pour l’instant. Patience encore un peu : bientôt je pourrai vraiment vous répondre, pas juste sourire dans le header.",
] as const;

export function pickPatientAiMockReply(): string {
  const index = Math.floor(Math.random() * PATIENT_AI_MOCK_REPLIES.length);
  return PATIENT_AI_MOCK_REPLIES[index] ?? PATIENT_AI_MOCK_REPLIES[0];
}

/** @deprecated Préférer {@link pickPatientAiMockReply}. */
export const PATIENT_AI_NOT_READY_REPLY = PATIENT_AI_MOCK_REPLIES[0];

/** @deprecated Utiliser {@link pickPatientAiMockReply}. */
export const PATIENT_AI_DEV_REPLY = PATIENT_AI_NOT_READY_REPLY;

export const PATIENT_AI_VOICE_MOCK_HINT =
  'La reconnaissance vocale est en cours de développement — cette animation illustre l’expérience à venir.';

export function patientAiGreeting(firstName: string): string {
  const name = firstName.trim();
  if (name) {
    return `Bonjour ${name}, qu'est-ce que je peux faire pour vous ?`;
  }
  return "Bonjour, qu'est-ce que je peux faire pour vous ?";
}

/** Emoji affiché par libellé `care_categories.name` (source de vérité + repli hors BDD). */
export const CARE_CATEGORY_EMOJI_BY_NAME: Readonly<Record<string, string>> = {
  // —— Soins infirmiers ——
  Pansement: '🩹',
  'Pansement-plaie': '🩹',
  'Pansement complexe': '🩹',
  Injection: '💉',
  'Injection sous-cutanée': '💉',
  'Injection intramusculaire': '💉',
  Prélèvement: '🧪',
  'Prélèvement urinaire': '🧪',
  Perfusion: '💧',
  'Soins de plaies': '🩹',
  Vaccination: '💉',
  'Soins post-opératoires': '🏥',
  'Toilette / soins d\'hygiène': '🛁',
  "Soins d'hygiène": '🛁',
  Rééducation: '🦽',
  Surveillance: '📊',
  'Surveillance constante': '📊',
  'Soins palliatifs': '🤍',
  'Pose de cathéter': '🩺',
  'Mesure tension / glycémie': '📈',
  'Aide aux repas': '🍽️',
  'Garde / surveillance nuit': '🌙',
  'Soins de stomie': '🩹',
  'Soins de sonde': '🩺',
  'Sonde urinaire': '🩺',
  'Soins respiratoires': '🫁',
  'Chimiothérapie à domicile': '💊',
  'Bilan de prévention': '✅',
  'Mon bilan prévention': '✅',
  'Epilation laser': '✨',
  'Soins à la personne': '👤',
  'Retrait de points / agrafes': '✂️',
  'Suivi diabète': '🩸',
  'Suivi post-hospitalisation': '🏠',
  Traitement: '💊',
  Autre: '➕',
  'Certificat de décès': '📄',

  // —— Analyses / laboratoire ——
  'Bilan complet': '🩸',
  'Bilan sanguin': '🩸',
  Glycémie: '🍬',
  'Glycémie à jeun': '🍽️',
  Cholestérol: '❤️‍🩹',
  Vitamines: '🌞',
  Hormones: '⚗️',
  Triglycérides: '🧬',
  NFS: '🩸',
  CRP: '🔬',
  'Bilan hépatique': '🫀',
  'Bilan rénal': '🫘',
  'Fer / Ferritine': '🔩',
  'Bilan martial': '🔩',
  'Bilan thyroïdien': '🦋',
  'Bilan lipidique': '🧪',
  HbA1c: '📊',
  'Bilan inflammatoire': '🔥',
  'Dépistage (VIH, hépatites)': '🛡️',
  'Dépistages infections': '🦠',
  'Bilan de coagulation': '🩸',
  'Bilan vitaminique': '💊',
  Sérologie: '🔬',
  'Marqueurs tumoraux': '🎯',
  'Bilan pré-opératoire': '🏥',
  "Bilan d'anesthésie": '💤',
  'Examen des selles': '🔬',
  'Examen des urines': '🚽',
  Grossesse: '🤰',
  'Prélèvement bactériologique': '🧫',
};

const EMOJI_IN_ICON_RE =
  /^(?:\p{Extended_Pictographic}\p{Emoji_Modifier}?|\p{Emoji_Presentation})(?:\uFE0F|\u200D(?:\p{Extended_Pictographic}\p{Emoji_Modifier}?))*$/u;

/** `care_categories.icon` contient un emoji (pas un nom Lucide). */
export function isCareCategoryEmoji(icon: string | null | undefined): boolean {
  const raw = icon != null ? String(icon).trim() : '';
  if (!raw || raw.length > 16) return false;
  if (/^(i-lucide-|lucide:|medical-icon:|healthicons:|covid:)/i.test(raw)) return false;
  return EMOJI_IN_ICON_RE.test(raw) || (raw.length <= 4 && !/^[a-z0-9_-]+$/i.test(raw));
}

export type CareCategoryEmojiInput = {
  name?: string | null;
  icon?: string | null;
  type?: string | null;
};

/** Emoji à afficher : BDD (`icon`) puis catalogue par nom, puis défaut type. */
export function careCategoryEmojiForCategory(cat: CareCategoryEmojiInput): string {
  const icon = cat.icon != null ? String(cat.icon).trim() : '';
  if (icon && isCareCategoryEmoji(icon)) return icon;

  const name = cat.name != null ? String(cat.name).trim() : '';
  if (name && CARE_CATEGORY_EMOJI_BY_NAME[name]) return CARE_CATEGORY_EMOJI_BY_NAME[name];

  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(CARE_CATEGORY_EMOJI_BY_NAME)) {
    if (key.toLowerCase() === lower) return emoji;
  }

  if (/pansement|plaie|stomie/i.test(name)) return '🩹';
  if (/injection|vaccin/i.test(name)) return '💉';
  if (/perfusion/i.test(name)) return '💧';
  if (/sonde|urinaire|urine/i.test(name)) return '🩺';
  if (/hygiène|toilette/i.test(name)) return '🛁';
  if (/respiratoire|aérosol/i.test(name)) return '🫁';
  if (/diabète|glycémie|hba1c/i.test(name)) return '🩸';
  if (/bilan|sanguin|nfs|crp|coagulation/i.test(name)) return '🩸';
  if (/grossesse|hcg/i.test(name)) return '🤰';
  if (/selles/i.test(name)) return '🔬';
  if (/dépistage|sérologie|infection/i.test(name)) return '🦠';
  if (/autre/i.test(name)) return '➕';
  if (/certificat|décès/i.test(name)) return '📄';

  return cat.type === 'blood_test' ? '🩸' : '🩺';
}

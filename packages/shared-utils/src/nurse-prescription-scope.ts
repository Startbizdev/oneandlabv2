/**
 * Cadre réglementaire — prescription infirmière (IDE).
 * Contenu statique versionné : mettre à jour lors de nouveaux arrêtés / fiches VIDAL.
 *
 * Pour ajouter une source : legalSources[]
 * Pour ajouter un domaine : categories[]
 * Pour une règle transversale : keyRules[]
 */

export type NursePrescriptionLegalSource = {
  id: string;
  label: string;
  url: string;
  publisher: 'Légifrance' | 'VIDAL' | 'HAS' | 'Ameli' | 'Ordre' | 'Autre';
  publishedAt?: string;
  note?: string;
};

export type NursePrescriptionScopeItem = {
  id: string;
  label: string;
  detail?: string;
};

export type NursePrescriptionScopeCategory = {
  id: string;
  title: string;
  /** Résumé une ligne sous le titre (accordéon fermé). */
  summary: string;
  items: NursePrescriptionScopeItem[];
  /** Limites ou conditions spécifiques au domaine. */
  limits?: string[];
};

export type NursePrescriptionKeyRule = {
  id: string;
  title: string;
  body: string;
};

export type NursePrescriptionScopeContent = {
  /** Identifiant de révision (ex. arrêté de référence). */
  version: string;
  /** ISO date — dernière mise à jour du contenu Cary. */
  updatedAt: string;
  modalTitle: string;
  modalSubtitle: string;
  intro: string;
  /** Encart spécifique à l’usage dans Cary (actes vs produits). */
  caryNotice: string;
  disclaimer: string;
  legalSources: NursePrescriptionLegalSource[];
  categories: NursePrescriptionScopeCategory[];
  keyRules: NursePrescriptionKeyRule[];
};

export const NURSE_PRESCRIPTION_SCOPE: NursePrescriptionScopeContent = {
  version: 'arrete-2026-06-26',
  updatedAt: '2026-08-27',
  modalTitle: 'Prescription infirmière',
  modalSubtitle: 'Ce que vous pouvez prescrire ou renouveler en tant qu’IDE',
  intro:
    'Depuis la loi infirmière (2025) et l’arrêté du 26 juin 2026 (article L.4311-1 du Code de la santé publique), les infirmiers diplômés d’État peuvent prescrire ou renouveler une liste de produits de santé et d’examens complémentaires. La liste est fixée par arrêté et révisée régulièrement.',
  caryNotice:
    'Dans Cary, ce formulaire sert surtout à rédiger une ordonnance d’actes et soins infirmiers (PDF). Pour les médicaments, vaccins ou examens biologiques visés par l’arrêté, vérifiez toujours le texte officiel et votre exercice (formation, traçabilité DMP, renouvellement vs primo-prescription).',
  disclaimer:
    'Information à titre indicatif — ne remplace pas le texte officiel ni l’avis de l’Ordre. Vous restez responsable de chaque prescription.',
  legalSources: [
    {
      id: 'l4311-1',
      label: 'Article L4311-1 — Code de la santé publique',
      url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045137201/',
      publisher: 'Légifrance',
      note: 'Base légale de la prescription infirmière',
    },
    {
      id: 'arrete-2026-06-26',
      label: 'Arrêté du 26 juin 2026 — liste des produits et examens',
      url: 'https://affairesjuridiques.aphp.fr/textes/arrete-du-26-juin-2026-fixant-la-liste-des-produits-de-sante-et-examens-complementaires-que-les-infirmiers-diplomes-detat-sont-autorises-a-prescrire-ou-a-renouveler/',
      publisher: 'Légifrance',
      publishedAt: '2026-06-27',
    },
    {
      id: 'vidal-infirmiers',
      label: 'VIDAL — Prescription par les infirmiers',
      url: 'https://www.vidal.fr/infos-pratiques/infirmiers-prescription-par-les-infirmiers-id11056.html',
      publisher: 'VIDAL',
      note: 'Synthèse pratique et références réglementaires',
    },
  ],
  categories: [
    {
      id: 'vaccination',
      title: 'Vaccination',
      summary: 'Vaccins du calendrier, grippe, COVID-19 selon arrêté.',
      items: [
        { id: 'vac-calendrier', label: 'Vaccins prévus par le calendrier vaccinal' },
        { id: 'vac-grippe', label: 'Vaccin antigrippe saisonnier' },
        { id: 'vac-covid', label: 'Vaccin COVID-19 (selon recommandations en vigueur)' },
      ],
      limits: ['Déclaration à l’Ordre et formation vaccinale selon les vaccins concernés.'],
    },
    {
      id: 'plaies',
      title: 'Plaies et pansements',
      summary: 'Produits et dispositifs pour soins de plaies (durée initiale limitée).',
      items: [
        { id: 'pansements', label: 'Pansements et dispositifs de soins de plaie' },
        { id: 'desinfection', label: 'Solutions antiseptiques adaptées aux plaies' },
        { id: 'contention', label: 'Bas de contention (prescription directe selon arrêté)' },
      ],
      limits: ['Pansements : prescription initiale en général limitée à 7 jours (renouvellement selon texte).'],
    },
    {
      id: 'sante-sexuelle',
      title: 'Santé sexuelle et reproductive',
      summary: 'Préservatifs, dépistage, contraception d’urgence, renouvellement pilule.',
      items: [
        { id: 'preservatifs', label: 'Préservatifs' },
        { id: 'contraception-urgence', label: 'Contraception d’urgence' },
        { id: 'tests-ist', label: 'Tests de dépistage (VIH, hépatites B/C, syphilis, chlamydia, gonocoque…)' },
        { id: 'beta-hcg', label: 'Dosage de β-HCG (confirmation / datation de grossesse)' },
        { id: 'contraception-orale', label: 'Renouvellement de contraception orale' },
      ],
      limits: [
        'Contraception orale : renouvellement uniquement (pas de primo-prescription), durée max. 6 mois, mention « Renouvellement infirmier ».',
      ],
    },
    {
      id: 'sevrage-tabac',
      title: 'Sevrage tabagique',
      summary: 'Substituts nicotiniques et bilans associés.',
      items: [
        { id: 'substituts-nicotiniques', label: 'Substituts nicotiniques' },
        { id: 'bilan-tabac', label: 'Examens biologiques de suivi liés au sevrage (selon arrêté)' },
      ],
    },
    {
      id: 'antalgiques',
      title: 'Antalgiques et soins courants',
      summary: 'Antalgiques palier I et produits de santé usuels.',
      items: [
        { id: 'palier-1', label: 'Antalgiques palier I (ex. paracétamol, ibuprofène — selon arrêté)' },
        { id: 'dm-usuels', label: 'Dispositifs médicaux et solutions stériles usuels' },
        { id: 'perfusion', label: 'Matériel de perfusion et de surveillance (selon arrêté)' },
      ],
    },
    {
      id: 'biologie',
      title: 'Examens biologiques',
      summary: 'Bilans de suivi prescrits par l’IDE dans le cadre de l’arrêté.',
      items: [
        { id: 'nfs', label: 'NFS (numération formule sanguine)' },
        { id: 'ecbu', label: 'ECBU' },
        { id: 'glycemie', label: 'Glycémie' },
        { id: 'inr', label: 'INR' },
        { id: 'hba1c', label: 'HbA1c (suivi diabète)' },
      ],
      limits: ['Uniquement les examens listés à l’arrêté et dans le cadre de votre exercice.'],
    },
    {
      id: 'actes-cary',
      title: 'Actes et soins infirmiers (ordonnance Cary)',
      summary: 'Ce que vous saisissez le plus souvent dans Cary aujourd’hui.',
      items: [
        { id: 'soins-plaies', label: 'Soins de plaies et pansements (actes)' },
        { id: 'injections', label: 'Injections et prélèvements' },
        { id: 'perfusions-actes', label: 'Perfusions et surveillance' },
        { id: 'autonomie', label: 'Aide à la toilette, prévention escarres, éducation thérapeutique' },
        { id: 'suivi', label: 'Séances de soins infirmiers à domicile (fréquence, durée)' },
      ],
      limits: [
        'Rédigez des actes clairs (type de soin, fréquence, durée). Évitez les posologies médicamenteuses si vous n’êtes pas dans le cadre produit de l’arrêté.',
      ],
    },
  ],
  keyRules: [
    {
      id: 'trace',
      title: 'Traçabilité',
      body: 'Toute prescription doit être tracée au dossier patient et, le cas échéant, au DMP.',
    },
    {
      id: 'identite',
      title: 'Ordonnance complète',
      body: 'Identité du prescripteur (nom, RPPS/Adeli), date, patient, contenu lisible. Signature selon vos usages Cary.',
    },
    {
      id: 'renouvellement-pharma',
      title: 'Renouvellement à l’identique',
      body: 'Le pharmacien peut exiger de consulter la prescription médicale initiale pour un renouvellement par l’IDE.',
    },
    {
      id: 'mise-a-jour',
      title: 'Évolution réglementaire',
      body: 'La liste est mise à jour par arrêté (au moins tous les 3 ans). Consultez Légifrance ou VIDAL en cas de doute.',
    },
  ],
};

/** Afficher l’aide prescription infirmière (web + mobile). */
export function shouldShowNursePrescriptionScopeHelp(
  role: string | null | undefined,
  prescriptionKind: 'medical' | 'nursing' | null | undefined,
): boolean {
  return role === 'nurse' && prescriptionKind === 'nursing';
}

/** Items accordéon Nuxt UI { label, content, value }. */
export function nursePrescriptionScopeAccordionItems(
  scope: NursePrescriptionScopeContent = NURSE_PRESCRIPTION_SCOPE,
): Array<{ label: string; content: string; value: string }> {
  return scope.categories.map((cat) => {
    const lines: string[] = [];
    if (cat.summary) lines.push(cat.summary);
    for (const item of cat.items) {
      lines.push(`• ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
    }
    if (cat.limits?.length) {
      lines.push('');
      lines.push('Conditions :');
      for (const lim of cat.limits) {
        lines.push(`• ${lim}`);
      }
    }
    return {
      value: cat.id,
      label: cat.title,
      content: lines.join('\n'),
    };
  });
}

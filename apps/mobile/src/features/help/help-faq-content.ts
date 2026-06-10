import type { MobileRole } from '@oneandlab/shared-constants';
import { SHOW_PRESCRIPTIONS_TAB_NAV } from '@/features/prescriptions/constants';

type HelpFaqItemDef = {
  question: string;
  answer: string;
};

type HelpFaqSectionDef = {
  title: string;
  items: HelpFaqItemDef[];
};

export type HelpFaqItem = HelpFaqItemDef & {
  slug: string;
};

export type HelpFaqSection = HelpFaqSectionDef & {
  slug: string;
  items: HelpFaqItem[];
};

export type HelpFaqContent = {
  roleLabel: string;
  intro: string;
  sections: HelpFaqSection[];
};

const COMMON_SECTIONS: HelpFaqSectionDef[] = [
  {
    title: 'Notifications',
    items: [
      {
        question: 'Icône cloche en haut de l’écran',
        answer:
          'La cloche dans l’en-tête ouvre votre centre de notifications Cary : rappels de rendez-vous, mises à jour de statut, messages importants. Un badge indique le nombre de notifications non lues.',
      },
      {
        question: 'Menu Notifications (Plus)',
        answer:
          'Depuis Plus > Notifications, consultez l’historique complet, marquez les messages comme lus et accédez rapidement au détail d’un rendez-vous concerné.',
      },
      {
        question: 'Notifications push sur l’appareil',
        answer:
          'Dans Plus > Paramètres de l’app, activez les notifications push pour recevoir des alertes même lorsque Cary n’est pas ouvert. Sur simulateur ou Expo Go, les push peuvent être limitées — utilisez un build de développement pour les tester.',
      },
    ],
  },
  {
    title: 'Paramètres et sécurité',
    items: [
      {
        question: 'Paramètres de l’app',
        answer:
          'Personnalisez Cary : mode daltonien (type et aperçu des couleurs), notifications push, et informations sur la version installée. Les réglages s’appliquent immédiatement sur cet appareil.',
      },
      {
        question: 'Biométrie (Face ID / empreinte)',
        answer:
          'Plus > Sécurité permet de vous reconnecter rapidement sans code email, via Face ID ou empreinte. La biométrie stocke votre session (pas votre mot de passe) sur cet appareil ; changez d’utilisateur ou réinstallez l’app pour la reconfigurer. Vous pouvez aussi créer un mot de passe depuis la même page.',
      },
      {
        question: 'Informations légales',
        answer:
          'Mentions légales, politique de confidentialité, conditions d’utilisation et page contact du site Cary s’ouvrent dans l’app, au même format que sur le web.',
      },
      {
        question: 'Déconnexion',
        answer:
          'Le bouton Déconnexion en bas de l’onglet Plus ferme votre session Cary sur cet appareil et vous ramène à l’écran de connexion.',
      },
    ],
  },
  {
    title: 'Documents médicaux',
    items: [
      {
        question: 'Consulter, remplacer ou télécharger un document',
        answer:
          'Pour chaque type de document (carte Vitale, ordonnance, etc.), trois actions sont disponibles : œil (aperçu), remplacer (nouvelle photo ou fichier), télécharger (export via le partage natif de l’appareil). Une ligne sur fond vert indique qu’un document est déjà enregistré.',
      },
      {
        question: 'Documents du profil et documents de rendez-vous',
        answer:
          'Les documents ajoutés dans votre profil (Plus > Mes documents pour les patients) sont réutilisables lors d’une prise de rendez-vous. Lors d’un RDV, les documents du profil peuvent être fusionnés avec ceux spécifiques à la consultation.',
      },
    ],
  },
];

const PATIENT_SECTIONS: HelpFaqSectionDef[] = [
  {
    title: 'Onglets principaux',
    items: [
      {
        question: 'RDV — Mes rendez-vous',
        answer:
          'Liste de vos rendez-vous passés et à venir. Touchez une ligne pour ouvrir le détail : date, lieu, professionnel, statut, documents associés et actions disponibles (annulation selon les règles Cary).',
      },
      {
        question: 'Réserver',
        answer:
          'Assistant de prise de rendez-vous : choix du type de soin ou du professionnel, créneau, patient concerné (vous ou un proche), pièces jointes médicales et consentement RGPD. Validez pour envoyer la demande ou confirmer le RDV.',
      },
      {
        question: 'Proches',
        answer:
          'Gérez les membres de votre famille ou personnes à charge : fiche identité, coordonnées et historique. Vous pouvez réserver un rendez-vous au nom d’un proche depuis l’onglet Réserver.',
      },
      {
        question: 'Avis',
        answer:
          'Consultez les avis que vous avez laissés après vos rendez-vous et accédez aux consultations éligibles pour noter votre expérience avec un professionnel Cary.',
      },
      {
        question: 'Plus',
        answer:
          'Hub de votre compte : profil, documents, résultats, paramètres, notifications, biométrie, aide et déconnexion.',
      },
    ],
  },
  {
    title: 'Menu Plus — Mon compte',
    items: [
      {
        question: 'Mon profil',
        answer:
          'Vos informations personnelles : identité, photo, coordonnées, adresse et données médicales utiles aux professionnels. Mettez à jour votre profil pour faciliter chaque rendez-vous.',
      },
      {
        question: 'Résultats',
        answer:
          'Accès à vos résultats d’analyses biologiques partagés via Cary, lorsque votre laboratoire ou professionnel les a mis à disposition.',
      },
      {
        question: 'Mes documents',
        answer:
          'Carte Vitale, ordonnances, mutuelle et autres pièces médicales stockées sur votre profil. Ils seront proposés automatiquement lors de vos prochaines réservations.',
      },
    ],
  },
  {
    title: 'Détail d’un rendez-vous (patient)',
    items: [
      {
        question: 'Informations et suivi',
        answer:
          'Sur la fiche RDV : rappel de la date et de l’adresse, contact du professionnel, statut en temps réel et historique des changements.',
      },
      {
        question: 'Documents du rendez-vous',
        answer:
          'Ajoutez ou consultez les documents liés à ce RDV précis (ordonnance du jour, bon de transport, etc.), en plus de ceux déjà présents sur votre profil.',
      },
    ],
  },
];

const NURSE_SECTIONS: HelpFaqSectionDef[] = [
  {
    title: 'Onglets principaux',
    items: [
      {
        question: 'RDV — Rendez-vous',
        answer:
          'Vue d’ensemble de votre agenda : rendez-vous du jour et à venir, filtres par statut, accès rapide au détail patient. Créez un RDV via Plus > Nouveau rendez-vous ou depuis la fiche d’un patient.',
      },
      {
        question: 'Demandes',
        answer:
          'Demandes de rendez-vous en attente de votre réponse (patients ou plateforme). Un badge sur l’onglet indique le nombre de demandes non traitées. Acceptez, refusez ou proposez un autre créneau selon votre disponibilité.',
      },
      {
        question: 'Calendrier',
        answer:
          'Planning mensuel ou hebdomadaire de vos interventions. Visualisez vos créneaux occupés et libres pour organiser votre tournée.',
      },
      {
        question: 'Patients',
        answer:
          'Répertoire de vos patients Cary : recherche, fiche détail (coordonnées, antécédents, documents), historique des RDV et accès aux résultats lorsque disponibles.',
      },
      {
        question: 'Plus',
        answer:
          'Actions professionnelles, profil public, abonnement, paramètres et aide.',
      },
    ],
  },
  {
    title: 'Menu Plus — Professionnel',
    items: [
      {
        question: 'Nouveau rendez-vous',
        answer:
          'Créez un rendez-vous pour un patient existant ou nouveau : type de soin, date, lieu et documents requis.',
      },
      {
        question: 'Mon profil',
        answer:
          'Coordonnées professionnelles, présentation publique, diplômes, types de soins proposés et zone de couverture géographique. Un profil complet améliore votre visibilité auprès des patients.',
      },
      {
        question: 'Partager mon profil',
        answer:
          'Génère un lien vers votre fiche publique Cary (si activée dans Présentation) à envoyer par message ou réseaux sociaux pour que des patients réservent directement.',
      },
      {
        question: 'Mes avis',
        answer:
          'Avis laissés par vos patients après consultation. Consultez votre note moyenne et les commentaires pour suivre votre réputation sur Cary.',
      },
      {
        question: 'Résultats',
        answer:
          'Consultation des résultats biologiques de vos patients lorsque le laboratoire les partage via la plateforme.',
      },
      {
        question: 'Abonnement',
        answer:
          'Gestion de votre offre Cary : formule active, facturation et options liées à votre activité d’infirmier(ère) libéral(e) sur la plateforme.',
      },
    ],
  },
  {
    title: 'Détail d’un rendez-vous (infirmier)',
    items: [
      {
        question: 'Actions sur le RDV',
        answer:
          'Mettez à jour le statut (confirmé, en cours, terminé, annulé), consultez l’adresse d’intervention, contactez le patient par téléphone ou message, et accédez aux documents médicaux du dossier.',
      },
      {
        question: 'Documents patient',
        answer:
          'Visualisez les documents du profil patient et ceux attachés au RDV. Les pièces du profil (ex. carte Vitale) apparaissent aussi sur la fiche rendez-vous.',
      },
    ],
  },
];

const PRO_SECTIONS: HelpFaqSectionDef[] = [
  {
    title: 'Onglets principaux',
    items: [
      {
        question: 'RDV — Rendez-vous',
        answer:
          'Liste et suivi de vos rendez-vous professionnels : consultations, visites, examens. Ouvrez le détail pour le dossier patient, les documents et les actions de statut.',
      },
      {
        question: 'Patients',
        answer:
          'Base patients : recherche, création, fiche détail avec coordonnées, historique des RDV et documents partagés.',
      },
      ...(SHOW_PRESCRIPTIONS_TAB_NAV
        ? [
            {
              question: 'Prescriptions',
              answer:
                'Gestion des ordonnances et prescriptions liées à votre activité : création, suivi et association aux patients Cary.',
            } satisfies HelpFaqItemDef,
          ]
        : []),
      {
        question: 'Calendrier',
        answer:
          'Vue calendrier de votre activité : créneaux planifiés, disponibilités et navigation rapide vers le détail d’un RDV.',
      },
      {
        question: 'Plus',
        answer:
          'Création de RDV, profil professionnel, résultats patients et paramètres du compte.',
      },
    ],
  },
  {
    title: 'Menu Plus — Professionnel',
    items: [
      {
        question: 'Nouveau rendez-vous',
        answer:
          'Planifiez un rendez-vous pour un patient : sélection du patient, motif, horaire et lieu d’intervention.',
      },
      {
        question: 'Mon profil',
        answer:
          'Informations professionnelles affichées dans Cary : identité, coordonnées, spécialité et paramètres de compte.',
      },
      {
        question: 'Résultats',
        answer:
          'Accès aux résultats d’analyses de vos patients lorsque le laboratoire les diffuse via Cary.',
      },
    ],
  },
  {
    title: 'Détail d’un rendez-vous (professionnel)',
    items: [
      {
        question: 'Suivi et statut',
        answer:
          'Consultez et mettez à jour le statut du rendez-vous, les informations pratiques (adresse, horaire) et les contacts du patient.',
      },
      {
        question: 'Dossier et documents',
        answer:
          'Documents médicaux du patient rattachés au profil et au RDV : ordonnances, carte Vitale, pièces complémentaires.',
      },
    ],
  },
];

const PRELEVEUR_SECTIONS: HelpFaqSectionDef[] = [
  {
    title: 'Onglets principaux',
    items: [
      {
        question: 'RDV — Rendez-vous',
        answer:
          'Liste des prélèvements à effectuer : adresses, horaires, patients et statuts. Touchez un RDV pour voir le détail, les consignes et les documents utiles au prélèvement.',
      },
      {
        question: 'Tournée',
        answer:
          'Vue optimisée de votre tournée du jour : enchaînement des interventions, ordre de passage et accès rapide à la navigation vers chaque adresse.',
      },
      {
        question: 'Calendrier',
        answer:
          'Planning global de vos tournées et créneaux de prélèvement sur la semaine ou le mois.',
      },
      {
        question: 'Plus',
        answer:
          'Profil préleveur, paramètres de l’app, notifications, aide et déconnexion.',
      },
    ],
  },
  {
    title: 'Menu Plus',
    items: [
      {
        question: 'Mon profil',
        answer:
          'Vos informations professionnelles de préleveur : identité, coordonnées et paramètres liés à votre compte Cary.',
      },
    ],
  },
  {
    title: 'Détail d’un rendez-vous (préleveur)',
    items: [
      {
        question: 'Informations de prélèvement',
        answer:
          'Adresse exacte, créneau horaire, contact patient, type d’analyses demandées et consignes spécifiques (jeûne, etc.).',
      },
      {
        question: 'Documents',
        answer:
          'Ordonnances, bon de prélèvement et pièces d’identité ou carte Vitale lorsque le patient les a transmis via Cary.',
      },
      {
        question: 'Statut du RDV',
        answer:
          'Mettez à jour l’avancement (en route, prélèvement effectué, incident) pour informer le laboratoire et le patient en temps réel.',
      },
    ],
  },
];

const ROLE_LABELS: Record<MobileRole, string> = {
  patient: 'Patient',
  nurse: 'Infirmier(ère)',
  pro: 'Professionnel de santé',
  preleveur: 'Préleveur',
};

const ROLE_INTROS: Record<MobileRole, string> = {
  patient:
    'Guide complet de l’application Cary pour les patients : chaque onglet, le menu Plus et les fonctionnalités de rendez-vous expliqués pas à pas.',
  nurse:
    'Guide Cary pour les infirmier(ère)s libéraux : agenda, demandes, patients, profil public et outils professionnels.',
  pro:
    'Guide Cary pour les professionnels de santé : rendez-vous, patients, calendrier et gestion du dossier.',
  preleveur:
    'Guide Cary pour les préleveurs : tournées, rendez-vous de prélèvement et suivi terrain.',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function withSlugs(role: MobileRole, sections: HelpFaqSectionDef[]): HelpFaqSection[] {
  return sections.map((section) => {
    const sectionSlug = `${role}-${slugify(section.title)}`;
    return {
      ...section,
      slug: sectionSlug,
      items: section.items.map((item, index) => ({
        ...item,
        slug: `${sectionSlug}-${index}`,
      })),
    };
  });
}

function roleSections(role: MobileRole): HelpFaqSectionDef[] {
  switch (role) {
    case 'patient':
      return PATIENT_SECTIONS;
    case 'nurse':
      return NURSE_SECTIONS;
    case 'pro':
      return PRO_SECTIONS;
    case 'preleveur':
      return PRELEVEUR_SECTIONS;
    default:
      return PATIENT_SECTIONS;
  }
}

export function getHelpFaqForRole(role: MobileRole | string | undefined): HelpFaqContent {
  const key = (role ?? 'patient') as MobileRole;
  const safeRole = (['patient', 'nurse', 'pro', 'preleveur'] as const).includes(key as MobileRole)
    ? (key as MobileRole)
    : 'patient';

  return {
    roleLabel: ROLE_LABELS[safeRole],
    intro: ROLE_INTROS[safeRole],
    sections: withSlugs(safeRole, [...roleSections(safeRole), ...COMMON_SECTIONS]),
  };
}

export function findHelpFaqTopic(
  role: MobileRole | string | undefined,
  slug: string,
): HelpFaqItem | null {
  const faq = getHelpFaqForRole(role);
  for (const section of faq.sections) {
    const item = section.items.find((entry) => entry.slug === slug);
    if (item) return item;
  }
  return null;
}

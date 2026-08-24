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
        question: 'À quoi sert la cloche ?',
        answer:
          'Elle ouvre vos alertes : rappel de visite, changement, message. Un point indique celles non lues.',
      },
      {
        question: 'Où est l’historique des alertes ?',
        answer:
          'Plus, puis Notifications. Vous pouvez les marquer comme lues et ouvrir la visite concernée.',
      },
      {
        question: 'Comment recevoir les alertes sur le téléphone ?',
        answer:
          'Plus, puis Paramètres : activez les notifications. Elles arrivent même si Cary est fermé.',
      },
    ],
  },
  {
    title: 'Paramètres et sécurité',
    items: [
      {
        question: 'Que puis-je régler ?',
        answer:
          'Plus, puis Paramètres : affichage (dont le mode daltonien), notifications, version de l’app.',
      },
      {
        question: 'Puis-je me connecter avec Face ID ?',
        answer:
          'Oui, dans Plus, puis Sécurité. L’app se souvient de vous sur cet appareil. Vous pouvez aussi y créer un mot de passe.',
      },
      {
        question: 'Où sont les mentions légales ?',
        answer:
          'Dans Plus, puis Informations légales : confidentialité, conditions, contact.',
      },
      {
        question: 'Comment me déconnecter ?',
        answer:
          'En bas de Plus. Votre session se ferme sur cet appareil.',
      },
    ],
  },
  {
    title: 'Documents médicaux',
    items: [
      {
        question: 'Comment voir ou remplacer un document ?',
        answer:
          'Sur la ligne : aperçu, remplacer, télécharger. Une ligne verte signifie qu’il est déjà enregistré.',
      },
      {
        question: 'Quelle différence entre documents du profil et de la visite ?',
        answer:
          'Ceux du profil (carte Vitale, etc.) servent à toutes les réservations. Vous pouvez en ajouter d’autres sur une visite précise.',
      },
    ],
  },
];

const PATIENT_SECTIONS: HelpFaqSectionDef[] = [
  {
    title: 'Onglets principaux',
    items: [
      {
        question: 'Où sont mes rendez-vous ?',
        answer:
          'Dans l’onglet RDV. Touchez une ligne pour la date, l’adresse, le professionnel, les documents. Vous pouvez annuler selon les règles indiquées.',
      },
      {
        question: 'Comment réserver ?',
        answer:
          'Onglet Réserver : type de soin, créneau, pour vous ou un proche, pièces utiles. Vous validez, la demande part.',
      },
      {
        question: 'Puis-je réserver pour un proche ?',
        answer:
          'Oui. Ajoutez sa fiche dans Proches, puis choisissez-le au moment de réserver.',
      },
      {
        question: 'Comment laisser un avis ?',
        answer:
          'Après une visite, vous pouvez noter votre expérience. Vos avis déjà publiés sont dans Avis.',
      },
      {
        question: 'C’est quoi Plus ?',
        answer:
          'Votre compte : profil, documents, résultats, paramètres, notifications, aide, déconnexion.',
      },
    ],
  },
  {
    title: 'Menu Plus — Mon compte',
    items: [
      {
        question: 'Comment mettre à jour mon profil ?',
        answer:
          'Dans Plus, puis Mon profil : identité, photo, coordonnées, adresse. Un profil à jour aide le professionnel.',
      },
      {
        question: 'Où sont mes résultats ?',
        answer:
          'Dans Plus, puis Résultats, quand le laboratoire les a partagés.',
      },
      {
        question: 'Où mettre ma carte Vitale ?',
        answer:
          'Dans Plus, puis Mes documents. Elle vous sera proposée à la prochaine réservation.',
      },
    ],
  },
  {
    title: 'Détail d’un rendez-vous (patient)',
    items: [
      {
        question: 'Que vois-je sur une visite ?',
        answer:
          'Date, adresse, contact du professionnel, statut, et l’historique des changements.',
      },
      {
        question: 'Puis-je ajouter un document à une visite ?',
        answer:
          'Oui, sur la fiche du rendez-vous, en plus de ceux déjà sur votre profil.',
      },
    ],
  },
];

const NURSE_SECTIONS: HelpFaqSectionDef[] = [
  {
    title: 'Onglets principaux',
    items: [
      {
        question: 'Où est mon agenda ?',
        answer:
          'Onglet RDV : aujourd’hui et à venir. Ouvrez une fiche pour le patient. Vous pouvez aussi créer une visite depuis Plus.',
      },
      {
        question: 'Comment traiter une demande ?',
        answer:
          'Onglet Demandes. Un point indique celles en attente. Vous acceptez, refusez, ou proposez un autre horaire.',
      },
      {
        question: 'Comment voir ma semaine ?',
        answer:
          'Onglet Calendrier : jours occupés et libres, pour organiser la tournée.',
      },
      {
        question: 'Où sont mes patients ?',
        answer:
          'Onglet Patients : recherche, fiche, historique, documents, résultats s’ils sont partagés.',
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
        question: 'Comment créer une visite ?',
        answer:
          'Plus, puis Nouveau rendez-vous : patient, soin, date, lieu, documents.',
      },
      {
        question: 'Comment soigner ma fiche ?',
        answer:
          'Plus, puis Mon profil : présentation, diplômes, soins, zone. Plus elle est complète, plus les patients comprennent qui vous êtes.',
      },
      {
        question: 'Comment partager ma fiche ?',
        answer:
          'Plus, puis Partager mon profil : un lien à envoyer. Les patients réservent chez vous.',
      },
      {
        question: 'Où sont mes avis ?',
        answer:
          'Plus, puis Mes avis : note et commentaires après les visites.',
      },
      {
        question: 'Résultats',
        answer:
          'Consultation des résultats biologiques de vos patients lorsque le laboratoire les partage via la plateforme.',
      },
      {
        question: 'Où gérer mon offre ?',
        answer:
          'Plus, puis Abonnement : formule, facture, options.',
      },
    ],
  },
  {
    title: 'Détail d’un rendez-vous (infirmier)',
    items: [
      {
        question: 'Que faire sur une visite ?',
        answer:
          'Mettre à jour le statut, voir l’adresse, appeler ou écrire au patient, ouvrir les documents.',
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
  nurse: 'Infirmier ou infirmière',
  pro: 'Professionnel de santé',
  preleveur: 'Préleveur',
};

const ROLE_INTROS: Record<MobileRole, string> = {
  patient:
    'Réserver, suivre une visite, ajouter un proche : les réponses, simplement.',
  nurse:
    'Demandes, tournée, patients et fiche publique : ce qu’il faut savoir.',
  pro:
    'Rendez-vous, patients et dossier : le nécessaire, sans jargon.',
  preleveur:
    'Tournée du jour, visites et suivi : le guide terrain.',
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
    const item = section.items.find((entry: HelpFaqItem) => entry.slug === slug);
    if (item) return item;
  }
  return null;
}

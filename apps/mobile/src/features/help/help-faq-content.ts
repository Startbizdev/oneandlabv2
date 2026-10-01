import type { MobileRole } from '@oneandlab/shared-constants';
import { SHOW_PRESCRIPTIONS_TAB_NAV } from '@/features/prescriptions/constants';
import { ROLE_TABS } from '@/navigation/role-tabs';

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

/** Libellé réel de l'onglet `more` : « Compte » côté patient, « Plus » ailleurs. */
function accountTabLabel(role: MobileRole): string {
  return ROLE_TABS[role].find((tab) => tab.name === 'more')?.label ?? 'Compte';
}

function commonSections(tab: string): HelpFaqSectionDef[] {
  return [
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
            'Sous la cloche, en haut de l’écran. Les alertes déjà lues y restent ; touchez-en une pour ouvrir la visite concernée.',
        },
        {
          question: 'Comment recevoir les alertes sur le téléphone ?',
          answer: `${tab}, puis Paramètres : activez les notifications push. Elles arrivent même si Cary est fermé.`,
        },
      ],
    },
    {
      title: 'Paramètres et sécurité',
      items: [
        {
          question: 'Que puis-je régler ?',
          answer: `${tab}, puis Paramètres : notifications, affichage, couleurs accessibles, version de l’app.`,
        },
        {
          question: 'Puis-je me connecter avec Face ID ?',
          answer: `Oui : ${tab}, puis Mot de passe et connexion, rubrique Connexion rapide. L’app se souvient de vous sur cet appareil.`,
        },
        {
          question: 'Où sont les mentions légales ?',
          answer: `${tab}, puis Informations légales : mentions légales, confidentialité, conditions d’utilisation.`,
        },
        {
          question: 'Comment me déconnecter ?',
          answer: `En bas de l’onglet ${tab}. Votre session se ferme sur cet appareil.`,
        },
        {
          question: 'Comment supprimer mon compte ?',
          answer: `${tab}, puis Supprimer mon compte. Un compte patient se supprime immédiatement ; pour un compte professionnel, une demande est envoyée à notre équipe.`,
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
}

const PATIENT_SECTIONS: HelpFaqSectionDef[] = [
  {
    title: 'Onglets principaux',
    items: [
      {
        question: 'Où sont mes rendez-vous ?',
        answer:
          'Dans l’onglet Accueil. Touchez une ligne pour la date, l’adresse, le professionnel, les documents. Vous pouvez annuler selon les règles indiquées.',
      },
      {
        question: 'Comment réserver ?',
        answer:
          'Onglet Réserver : type de soin, créneau, pour vous ou un proche, pièces utiles. Vous validez, la demande part.',
      },
      {
        question: 'Où sont mes résultats ?',
        answer: 'Dans l’onglet Résultats, quand le laboratoire les a partagés.',
      },
      {
        question: 'Que trouve-t-on dans Compte ?',
        answer:
          'Votre profil, votre santé (carnet, documents, traitements, données santé), vos proches et vos avis, puis les paramètres, l’aide et la déconnexion.',
      },
    ],
  },
  {
    title: 'Onglet Compte',
    items: [
      {
        question: 'Comment mettre à jour mon profil ?',
        answer:
          'Touchez votre nom en haut de Compte : identité, photo, coordonnées, adresse. Un profil à jour aide le professionnel.',
      },
      {
        question: 'Puis-je réserver pour un proche ?',
        answer: 'Oui. Ajoutez sa fiche dans Compte, puis Mes proches, et choisissez-le au moment de réserver.',
      },
      {
        question: 'Où mettre ma carte Vitale ?',
        answer: 'Compte, puis Mes documents. Elle vous sera proposée à la prochaine réservation.',
      },
      {
        question: 'Comment laisser un avis ?',
        answer:
          'Après une visite, vous pouvez noter votre expérience. Vos avis déjà publiés sont dans Compte, puis Mes avis.',
      },
    ],
  },
  {
    title: 'Détail d’un rendez-vous',
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
        question: 'Comment organiser ma journée ?',
        answer: 'Onglet Tournée : vos visites du jour, dans l’ordre de passage.',
      },
      {
        question: 'Comment traiter une demande ?',
        answer:
          'Onglet Demandes. Un point indique celles en attente. Vous acceptez, refusez, ou proposez un autre horaire.',
      },
      {
        question: 'Où est mon agenda ?',
        answer:
          'Onglet Agenda : aujourd’hui et à venir. Ouvrez une fiche pour le patient.',
      },
      {
        question: 'Où sont mes patients ?',
        answer:
          'Onglet Patients : recherche, fiche, historique, documents, résultats s’ils sont partagés.',
      },
      {
        question: 'Que trouve-t-on dans Plus ?',
        answer:
          'Nouveau rendez-vous, assistant, résultats, profil public, avis, abonnement, puis les paramètres et l’aide.',
      },
    ],
  },
  {
    title: 'Onglet Plus',
    items: [
      {
        question: 'Comment créer une visite ?',
        answer:
          'Plus, puis Nouveau rendez-vous : patient, soin, date, lieu, documents.',
      },
      {
        question: 'Comment soigner ma fiche ?',
        answer:
          'Touchez votre nom en haut de Plus : présentation, diplômes, soins, zone. Plus elle est complète, plus les patients comprennent qui vous êtes.',
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
        question: 'Où sont les résultats de mes patients ?',
        answer: 'Plus, puis Résultats, quand le laboratoire les partage via Cary.',
      },
      {
        question: 'Où gérer mon offre ?',
        answer:
          'Plus, puis Abonnement : formule, facture, options.',
      },
    ],
  },
  {
    title: 'Détail d’un rendez-vous',
    items: [
      {
        question: 'Que faire sur une visite ?',
        answer:
          'Mettre à jour le statut, voir l’adresse, appeler ou écrire au patient, ouvrir les documents.',
      },
      {
        question: 'Où sont les documents du patient ?',
        answer:
          'Sur la fiche du rendez-vous : ceux joints à la visite et ceux du profil patient (ex. carte Vitale).',
      },
    ],
  },
];

const PRO_SECTIONS: HelpFaqSectionDef[] = [
  {
    title: 'Onglets principaux',
    items: [
      {
        question: 'Où sont mes rendez-vous ?',
        answer:
          'Onglet Accueil : vos rendez-vous et leur suivi. Ouvrez-en un pour le dossier patient, les documents et les actions de statut.',
      },
      {
        question: 'Où sont mes patients ?',
        answer:
          'Onglet Patients : recherche, création, fiche avec coordonnées, historique des rendez-vous et documents partagés.',
      },
      ...(SHOW_PRESCRIPTIONS_TAB_NAV
        ? [
            {
              question: 'Où sont mes prescriptions ?',
              answer:
                'Onglet Prescriptions : création, suivi et association aux patients Cary.',
            } satisfies HelpFaqItemDef,
          ]
        : []),
      {
        question: 'Où voir mon planning ?',
        answer:
          'Onglet Agenda : vos créneaux planifiés et un accès rapide au détail d’un rendez-vous.',
      },
      {
        question: 'Que trouve-t-on dans Plus ?',
        answer:
          'Nouveau rendez-vous, résultats patients, assistant, profil public, puis les paramètres et l’aide.',
      },
    ],
  },
  {
    title: 'Onglet Plus',
    items: [
      {
        question: 'Comment créer un rendez-vous ?',
        answer:
          'Plus, puis Nouveau rendez-vous : patient, motif, horaire et lieu d’intervention.',
      },
      {
        question: 'Comment modifier mon profil ?',
        answer:
          'Touchez votre nom en haut de Plus : identité, coordonnées, spécialité.',
      },
      {
        question: 'Où sont les résultats de mes patients ?',
        answer: 'Plus, puis Résultats, quand le laboratoire les diffuse via Cary.',
      },
    ],
  },
  {
    title: 'Détail d’un rendez-vous',
    items: [
      {
        question: 'Que faire sur un rendez-vous ?',
        answer:
          'Consultez et mettez à jour le statut, les informations pratiques (adresse, horaire) et les contacts du patient.',
      },
      {
        question: 'Où sont les documents du patient ?',
        answer:
          'Sur la fiche du rendez-vous : ordonnances, carte Vitale et pièces complémentaires, du profil ou de la visite.',
      },
    ],
  },
];

const PRELEVEUR_SECTIONS: HelpFaqSectionDef[] = [
  {
    title: 'Onglets principaux',
    items: [
      {
        question: 'Où sont mes prélèvements ?',
        answer:
          'Onglet Accueil : adresses, horaires, patients et statuts. Touchez un rendez-vous pour le détail, les consignes et les documents utiles.',
      },
      {
        question: 'Où sont mes patients ?',
        answer: 'Onglet Patients : recherche et fiche de chaque patient.',
      },
      {
        question: 'Comment organiser ma journée ?',
        answer:
          'Onglet Tournée : l’enchaînement des interventions, l’ordre de passage et l’accès à la navigation vers chaque adresse.',
      },
      {
        question: 'Où voir mon planning ?',
        answer: 'Onglet Agenda : vos tournées et créneaux de prélèvement.',
      },
      {
        question: 'Que trouve-t-on dans Plus ?',
        answer: 'L’assistant Cary, votre profil, les paramètres, l’aide et la déconnexion.',
      },
    ],
  },
  {
    title: 'Détail d’un rendez-vous',
    items: [
      {
        question: 'Quelles informations pour le prélèvement ?',
        answer:
          'Adresse exacte, créneau horaire, contact patient, type d’analyses demandées et consignes spécifiques (jeûne, etc.).',
      },
      {
        question: 'Où sont les documents ?',
        answer:
          'Ordonnances, bon de prélèvement et pièces d’identité ou carte Vitale lorsque le patient les a transmis via Cary.',
      },
      {
        question: 'Comment mettre à jour le statut ?',
        answer:
          'Sur la fiche du rendez-vous : l’avancement informe le laboratoire et le patient en temps réel.',
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
    sections: withSlugs(safeRole, [...roleSections(safeRole), ...commonSections(accountTabLabel(safeRole))]),
  };
}

function foldForSearch(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Questions dont la question, la réponse ou la rubrique contient tous les mots saisis. */
export function searchHelpFaq(content: HelpFaqContent, query: string): HelpFaqItem[] {
  const words = foldForSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return content.sections.flatMap((section) =>
    section.items.filter((item: HelpFaqItem) => {
      const haystack = foldForSearch(`${section.title} ${item.question} ${item.answer}`);
      return words.every((word) => haystack.includes(word));
    }),
  );
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

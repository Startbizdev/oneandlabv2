import {
  CalendarDays,
  CalendarPlus,
  CircleUserRound,
  FileText,
  FlaskConical,
  House,
  Inbox,
  LayoutGrid,
  Route,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react-native';

export type RoleTab = {
  /** Nom de route expo-router dans `app/(<rôle>)/(tabs)/`. */
  name: string;
  /** Libellé court (une ligne), lu aussi par VoiceOver / TalkBack. */
  label: string;
  icon: LucideIcon;
  /** Onglet affichant un compteur, fourni par le layout du rôle. */
  hasBadge?: boolean;
  /** Onglet masqué selon les droits, visibilité fournie par le layout du rôle. */
  conditional?: boolean;
};

export type TabRole = 'patient' | 'nurse' | 'pro' | 'preleveur';

const HOME = { label: 'Accueil', icon: House } as const;
const AGENDA = { label: 'Agenda', icon: CalendarDays } as const;
const PATIENTS = { label: 'Patients', icon: Users } as const;
const TOURNEE = { label: 'Tournée', icon: Route } as const;
const MORE = { label: 'Plus', icon: LayoutGrid } as const;

/** Source unique des onglets par rôle (ordre = ordre d'affichage). */
export const ROLE_TABS: Record<TabRole, readonly RoleTab[]> = {
  patient: [
    { name: 'appointments', ...HOME },
    { name: 'results', label: 'Résultats', icon: FlaskConical },
    { name: 'book', label: 'Réserver', icon: CalendarPlus },
    { name: 'ai', label: 'Assistant', icon: Sparkles },
    { name: 'more', label: 'Compte', icon: CircleUserRound },
  ],
  nurse: [
    { name: 'tournee', ...TOURNEE },
    { name: 'demandes', label: 'Demandes', icon: Inbox, hasBadge: true },
    // Route `appointments` conservée : accueil après connexion et liens existants y pointent.
    { name: 'appointments', ...AGENDA },
    { name: 'patients', ...PATIENTS },
    { name: 'more', ...MORE },
  ],
  pro: [
    { name: 'appointments', ...HOME },
    { name: 'patients', ...PATIENTS },
    { name: 'calendar', ...AGENDA },
    // Juste avant « Plus » : son apparition selon les droits ne décale pas les autres onglets.
    { name: 'prescriptions', label: 'Prescriptions', icon: FileText, conditional: true },
    { name: 'more', ...MORE },
  ],
  preleveur: [
    { name: 'index', ...HOME },
    { name: 'patients', ...PATIENTS },
    { name: 'tournee', ...TOURNEE },
    { name: 'calendar', ...AGENDA },
    { name: 'more', ...MORE },
  ],
};

/** Onglets affichés : un onglet `conditional` n'apparaît que si le layout l'autorise explicitement. */
export function visibleRoleTabs(
  tabs: readonly RoleTab[],
  visible: Partial<Record<string, boolean>> = {},
): RoleTab[] {
  return tabs.filter((tab) => !tab.conditional || visible[tab.name] === true);
}

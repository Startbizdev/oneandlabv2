import { Platform } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  Badge,
  Icon,
  Label,
  NativeTabs,
  VectorIcon,
} from 'expo-router/unstable-native-tabs';
import type { SFSymbol } from 'sf-symbols-typescript';
import { useAppColors } from '@/theme/use-app-colors';

export type NativeTabTriggerConfig = {
  name: string;
  hidden?: boolean;
  /** Libellé court affiché sous l'icône (lu aussi par VoiceOver / TalkBack). */
  label: string;
  sf: { default: SFSymbol; selected: SFSymbol };
  androidIcon: keyof typeof MaterialIcons.glyphMap;
  badge?: string;
};

/**
 * Factory layout onglets — retourne un composant qui rend `<NativeTabs>` directement
 * (obligatoire pour expo-router : pas de wrapper custom dans `_layout`).
 */
export function createRoleTabsLayout(
  tabsOrFactory: NativeTabTriggerConfig[] | (() => NativeTabTriggerConfig[]),
) {
  return function RoleTabsLayout() {
    const c = useAppColors();
    const tabs = typeof tabsOrFactory === 'function' ? tabsOrFactory() : tabsOrFactory;

    const androidTabProps = Platform.OS === 'android'
      ? {
          disableIndicator: true as const,
          iconColor: { default: c.textSecondary, selected: c.primary } as const,
          rippleColor: c.primaryMid,
          backgroundColor: c.surface,
          tabBarRespectsIMEInsets: true as const,
        }
      : {
          tintColor: c.primary,
          rippleColor: c.primaryMid,
          indicatorColor: c.primary,
          blurEffect: 'none' as const,
          backgroundColor: c.surface,
        };

    return (
      <NativeTabs
        minimizeBehavior="never"
        labelVisibilityMode="labeled"
        labelStyle={{
          default: { color: c.textSecondary },
          selected: { color: c.primary },
        }}
        disableTransparentOnScrollEdge
        {...androidTabProps}
      >
        {tabs.map((tab) => (
          <NativeTabs.Trigger
            key={tab.name}
            name={tab.name}
            hidden={tab.hidden}
            options={{
              disableTransparentOnScrollEdge: true,
            }}
          >
            <Icon
              sf={tab.sf}
              selectedColor={c.primary}
              androidSrc={<VectorIcon family={MaterialIcons} name={tab.androidIcon} />}
            />
            <Label>{tab.label}</Label>
            {tab.badge ? <Badge>{tab.badge}</Badge> : null}
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    );
  };
}

type TabTrigger = Omit<NativeTabTriggerConfig, 'name'>;

/** Accueil du rôle (liste des rendez-vous + salutation). */
export const HOME_TAB_TRIGGER: TabTrigger = {
  label: 'Accueil',
  sf: { default: 'house', selected: 'house.fill' },
  androidIcon: 'home',
};

/** Onglet « Plus » des professionnels. */
export const MORE_TAB_TRIGGER: TabTrigger = {
  label: 'Plus',
  sf: { default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' },
  androidIcon: 'apps',
};

/** Onglet « Compte » du patient (même écran que « Plus », vocabulaire patient). */
export const ACCOUNT_TAB_TRIGGER: TabTrigger = {
  label: 'Compte',
  sf: { default: 'person.crop.circle', selected: 'person.crop.circle.fill' },
  androidIcon: 'account-circle',
};

export const AGENDA_TAB_TRIGGER: TabTrigger = {
  label: 'Agenda',
  sf: { default: 'calendar', selected: 'calendar' },
  androidIcon: 'event',
};

export const TOURNEE_TAB_TRIGGER: TabTrigger = {
  label: 'Tournée',
  sf: {
    default: 'point.topleft.down.to.point.bottomright.curvepath',
    selected: 'point.topleft.down.to.point.bottomright.curvepath.fill',
  },
  androidIcon: 'route',
};

export const PATIENTS_TAB_TRIGGER: TabTrigger = {
  label: 'Patients',
  sf: { default: 'person.2', selected: 'person.2.fill' },
  androidIcon: 'people',
};
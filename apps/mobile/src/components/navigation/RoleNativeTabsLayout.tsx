import type { ReactNode } from 'react';
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
  accessibilityLabel: string;
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
  minimizeOnScroll = true,
) {
  return function RoleTabsLayout() {
    const c = useAppColors();
    const tabs = typeof tabsOrFactory === 'function' ? tabsOrFactory() : tabsOrFactory;

    return (
      <NativeTabs
        minimizeBehavior="never"
        labelVisibilityMode="unlabeled"
        tintColor={c.primary}
        rippleColor={c.primaryMid}
        indicatorColor={c.primary}
        backgroundColor={c.surface}
        blurEffect="none"
        disableTransparentOnScrollEdge
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
            <Label hidden>{tab.accessibilityLabel}</Label>
            {tab.badge ? <Badge>{tab.badge}</Badge> : null}
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    );
  };
}

/** @deprecated Préférer `createRoleTabsLayout()` dans `_layout.tsx`. */
export function RoleNativeTabsLayout({
  tabs,
  minimizeOnScroll = true,
}: {
  tabs: NativeTabTriggerConfig[];
  minimizeOnScroll?: boolean;
  children?: ReactNode;
}) {
  const Layout = createRoleTabsLayout(tabs, minimizeOnScroll);
  return <Layout />;
}

/** Onglet « Plus » — icône système iOS quand disponible. */
export const MORE_TAB_TRIGGER: Omit<NativeTabTriggerConfig, 'name'> = {
  accessibilityLabel: 'Plus',
  sf: { default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' },
  androidIcon: 'apps',
};

export const APPOINTMENTS_TAB_TRIGGER: Omit<NativeTabTriggerConfig, 'name'> = {
  accessibilityLabel: 'Rendez-vous',
  sf: { default: 'calendar', selected: 'calendar' },
  androidIcon: 'event',
};

/** Onglet calendrier / agenda — sans le cercle `calendar.circle`. */
export const CALENDAR_TAB_TRIGGER: Omit<NativeTabTriggerConfig, 'name'> = {
  accessibilityLabel: 'Calendrier',
  sf: { default: 'calendar.badge.clock', selected: 'calendar.badge.clock' },
  androidIcon: 'view-agenda',
};

/** SF Symbols header — mêmes icônes que la tab bar (default). */
export const TAB_HEADER_SF = {
  appointments: APPOINTMENTS_TAB_TRIGGER.sf.default,
  more: MORE_TAB_TRIGGER.sf.default,
  calendar: CALENDAR_TAB_TRIGGER.sf.default,
  book: 'calendar.badge.plus',
  relatives: 'heart',
  ai: 'face.smiling',
  demandes: 'clipboard',
  patients: 'person.2',
  prescriptions: 'doc.text',
  tournee: 'map',
  notifications: 'bell',
} as const satisfies Record<string, SFSymbol>;

/** SF Symbols stack profil (cohérents avec le design système). */
export const PROFILE_HEADER_SF = {
  profile: 'person.circle',
  account: 'person.circle',
  personal: 'person.text.rectangle',
  settings: 'gearshape',
  help: 'questionmark.circle',
  support: 'envelope',
  security: 'lock',
  documents: 'doc.text',
  coordinates: 'mappin.and.ellipse',
  presentation: 'globe',
  nurseSettings: 'gearshape',
  qualifications: 'graduationcap',
  careTypes: 'heart.text.square',
  coverage: 'map',
  reviews: 'star',
  qrCode: 'qrcode',
} as const satisfies Record<string, SFSymbol>;

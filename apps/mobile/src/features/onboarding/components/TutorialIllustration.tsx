import type { ReactNode } from 'react';
import { AppText } from '@/theme';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { TutorialIllustrationKey } from '@oneandlab/onboarding';

type Props = {
  illustration: TutorialIllustrationKey;
};

function IllustrationCanvas({ children }: { children: ReactNode }) {
  return (
    <View className="relative w-full max-w-[300px] self-center">
      <View className="absolute inset-x-0 top-0 items-center">
        <View className="h-[120px] w-[120px] rounded-full bg-primary-50 opacity-90" />
      </View>
      <View className="absolute -left-2 top-6 h-[88px] w-[88px] rounded-full bg-primary-100 opacity-70" />
      <View className="absolute -right-1 bottom-4 h-[56px] w-[56px] rounded-full bg-primary-200 opacity-45" />
      <View className="relative overflow-hidden rounded-3xl border border-primary-100/80 bg-white px-5 py-6 shadow-md">
        {children}
      </View>
    </View>
  );
}

function StatusPill({
  label,
  tone = 'primary',
}: {
  label: string;
  tone?: 'primary' | 'success' | 'warning';
}) {
  const containerClass =
    tone === 'success'
      ? 'border-success-mid bg-success-light'
      : tone === 'warning'
        ? 'border-warning-mid bg-warning-light'
        : 'border-primary-200 bg-primary-50';
  const textClass =
    tone === 'success'
      ? 'text-success-700'
      : tone === 'warning'
        ? 'text-warning-700'
        : 'text-primary-800';

  return (
    <View className={`rounded-full border px-2.5 py-0.5 ${containerClass}`}>
      <AppText className={`font-nunito-semibold text-2xs ${textClass}`}>{label}</AppText>
    </View>
  );
}

function Avatar({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <View
      className={`h-11 w-11 items-center justify-center rounded-2xl ${
        accent ? 'bg-primary' : 'bg-slate-100'
      }`}
    >
      <AppText className={`font-nunito-bold text-sm ${accent ? 'text-white' : 'text-slate-600'}`}>
        {label}
      </AppText>
    </View>
  );
}

function FeatureRow({
  avatar,
  title,
  subtitle,
  pill,
  accent,
}: {
  avatar: string;
  title: string;
  subtitle: string;
  pill?: { label: string; tone?: 'primary' | 'success' | 'warning' };
  accent?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center gap-3 rounded-2xl border p-3.5 ${
        accent ? 'border-primary-200 bg-primary-50/80' : 'border-slate-100 bg-slate-50/80'
      }`}
    >
      <Avatar label={avatar} accent={accent} />
      <View className="min-w-0 flex-1 gap-1">
        <AppText className="font-nunito-bold text-sm text-slate-900" numberOfLines={1}>
          {title}
        </AppText>
        <AppText className="font-nunito text-xs text-slate-500" numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
      {pill ? <StatusPill label={pill.label} tone={pill.tone} /> : null}
    </View>
  );
}

function ChatBubble({
  text,
  side,
  ai,
}: {
  text: string;
  side: 'left' | 'right';
  ai?: boolean;
}) {
  const isRight = side === 'right';
  return (
    <View className={`max-w-[88%] ${isRight ? 'self-end' : 'self-start'}`}>
      {ai ? (
        <View className="mb-1 flex-row items-center gap-1.5">
          <View className="h-5 w-5 items-center justify-center rounded-full bg-primary">
            <AppText className="font-nunito-black text-2xs text-white">C</AppText>
          </View>
          <AppText className="font-nunito-semibold text-2xs text-primary-700">Cary</AppText>
        </View>
      ) : null}
      <View
        className={`rounded-2xl px-3.5 py-2.5 ${
          isRight ? 'rounded-tr-sm bg-primary' : 'rounded-tl-sm border border-slate-100 bg-slate-50'
        }`}
      >
        <AppText
          className={`font-nunito text-xs leading-[18px] ${isRight ? 'text-white' : 'text-slate-700'}`}
        >
          {text}
        </AppText>
      </View>
    </View>
  );
}

function IllustrationBody({ illustration }: Props) {
  switch (illustration) {
    case 'welcome':
      return (
        <View className="items-center gap-5">
          <View className="relative">
            <View className="absolute -inset-2 rounded-full bg-primary-100 opacity-60" />
            <LinearGradient
              colors={['#2FD4C2', '#1CC7B5', '#16B6D6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <AppText className="font-nunito-black text-4xl text-white">C</AppText>
            </LinearGradient>
            <View className="absolute -right-1 -top-1 h-5 w-5 rounded-full border-2 border-white bg-warning" />
          </View>
          <View className="items-center gap-2">
            <View className="h-3 w-[140px] rounded-full bg-primary-100" />
            <View className="h-2.5 w-[100px] rounded-full bg-slate-200" />
          </View>
          <View className="flex-row gap-2">
            {['Soins', 'RDV', 'Proches'].map((tag) => (
              <View key={tag} className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1">
                <AppText className="font-nunito-semibold text-2xs text-primary-800">{tag}</AppText>
              </View>
            ))}
          </View>
        </View>
      );

    case 'appointments':
      return (
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <AppText className="font-nunito-bold text-sm text-slate-900">Mes rendez-vous</AppText>
            <StatusPill label="2 à venir" tone="primary" />
          </View>
          <FeatureRow
            avatar="🩹"
            title="Pansement"
            subtitle="Demain · 14h30 · Domicile"
            pill={{ label: 'Confirmé', tone: 'success' }}
            accent
          />
          <FeatureRow
            avatar="🧪"
            title="Prélèvement"
            subtitle="Vendredi · 09h00"
            pill={{ label: 'En attente', tone: 'warning' }}
          />
        </View>
      );

    case 'book':
      return (
        <View className="gap-4">
          <AppText className="font-nunito-bold text-sm text-slate-900">Choisir un soin</AppText>
          <View className="flex-row flex-wrap gap-2">
            {[
              { emoji: '🩹', label: 'Pansement', active: true },
              { emoji: '🧪', label: 'Prélèvement', active: false },
              { emoji: '💗', label: 'Suivi', active: false },
            ].map((item) => (
              <View
                key={item.label}
                className={`items-center rounded-2xl border px-3 py-2.5 ${
                  item.active
                    ? 'border-primary bg-primary-50'
                    : 'border-slate-100 bg-slate-50'
                }`}
              >
                <AppText className="text-xl">{item.emoji}</AppText>
                <AppText
                  className={`mt-1 font-nunito-semibold text-2xs ${
                    item.active ? 'text-primary-800' : 'text-slate-500'
                  }`}
                >
                  {item.label}
                </AppText>
              </View>
            ))}
          </View>
          <View className="flex-row items-center gap-2">
            {[1, 2, 3].map((step) => (
              <View
                key={step}
                className={`h-1.5 flex-1 rounded-full ${step <= 2 ? 'bg-primary' : 'bg-slate-200'}`}
              />
            ))}
          </View>
          <View className="items-center rounded-xl bg-primary py-3">
            <AppText className="font-nunito-bold text-sm text-white">Continuer la réservation</AppText>
          </View>
        </View>
      );

    case 'relatives':
      return (
        <View className="gap-3">
          <AppText className="font-nunito-bold text-sm text-slate-900">Mes proches</AppText>
          <FeatureRow
            avatar="M"
            title="Marie Dupont"
            subtitle="Enfant · Carte Vitale à jour"
            pill={{ label: 'Actif', tone: 'success' }}
            accent
          />
          <View className="flex-row items-center gap-3 rounded-2xl border border-dashed border-primary-200 bg-primary-50/50 p-3.5">
            <View className="h-11 w-11 items-center justify-center rounded-2xl border border-primary-200 bg-white">
              <AppText className="text-lg">📄</AppText>
            </View>
            <View className="flex-1 gap-1">
              <AppText className="font-nunito-bold text-sm text-slate-900">Documents</AppText>
              <AppText className="font-nunito text-xs text-slate-500">Ordonnance · Mutuelle</AppText>
            </View>
            <View className="h-7 w-7 items-center justify-center rounded-full bg-primary">
              <AppText className="font-nunito-bold text-xs text-white">+</AppText>
            </View>
          </View>
        </View>
      );

    case 'ai':
      return (
        <View className="gap-3">
          <ChatBubble text="Bonjour ! Comment puis-je vous aider pour votre prochain soin ?" side="left" ai />
          <ChatBubble text="Je voudrais prendre un RDV pour ma mère" side="right" />
          <View className="self-start rounded-2xl rounded-tl-sm border border-primary-100 bg-primary-50 px-3.5 py-2.5">
            <View className="mb-1 flex-row items-center gap-1">
              <AppText className="text-xs">✨</AppText>
              <AppText className="font-nunito-semibold text-2xs text-primary-700">Suggestion Cary</AppText>
            </View>
            <AppText className="font-nunito text-xs leading-[18px] text-slate-700">
              Pansement à domicile demain 14h — voulez-vous confirmer ?
            </AppText>
          </View>
        </View>
      );

    case 'notifications':
      return (
        <View className="gap-4">
          <View className="flex-row items-center gap-3">
            <View className="relative h-12 w-12 items-center justify-center rounded-2xl bg-primary-50">
              <AppText className="text-xl">🔔</AppText>
              <View className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-error" />
            </View>
            <View className="flex-1 gap-1">
              <AppText className="font-nunito-bold text-sm text-slate-900">Notifications</AppText>
              <AppText className="font-nunito text-xs text-slate-500">Restez informé en temps réel</AppText>
            </View>
          </View>
          <View className="gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
            <View className="flex-row items-start gap-2.5">
              <View className="mt-0.5 h-2 w-2 rounded-full bg-primary" />
              <View className="flex-1 gap-1">
                <AppText className="font-nunito-bold text-xs text-slate-900">RDV confirmé</AppText>
                <AppText className="font-nunito text-2xs leading-4 text-slate-500">
                  Votre pansement est prévu demain à 14h30
                </AppText>
              </View>
            </View>
            <View className="h-px bg-slate-200" />
            <View className="flex-row items-start gap-2.5 opacity-70">
              <View className="mt-0.5 h-2 w-2 rounded-full bg-slate-300" />
              <View className="flex-1 gap-1">
                <AppText className="font-nunito-semibold text-xs text-slate-700">Rappel J-1</AppText>
                <AppText className="font-nunito text-2xs text-slate-400">Envoyé la veille du soin</AppText>
              </View>
            </View>
          </View>
        </View>
      );

    case 'demandes':
      return (
        <View className="gap-3">
          <FeatureRow
            avatar="📍"
            title="Nouvelle demande"
            subtitle="Pansement · 2 km · Aujourd'hui"
            pill={{ label: 'Urgent', tone: 'warning' }}
            accent
          />
          <View className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <View className="mb-2 flex-row items-center gap-2">
              <View className="h-8 w-8 rounded-full bg-primary-100" />
              <View className="h-2 flex-1 rounded-full bg-slate-200" />
            </View>
            <View className="h-16 rounded-xl border border-primary-100 bg-primary-50/60" />
          </View>
          <View className="flex-row gap-2.5">
            <View className="flex-1 items-center rounded-xl bg-primary py-2.5">
              <AppText className="font-nunito-bold text-xs text-white">Accepter</AppText>
            </View>
            <View className="flex-1 items-center rounded-xl border border-slate-200 bg-white py-2.5">
              <AppText className="font-nunito-semibold text-xs text-slate-600">Refuser</AppText>
            </View>
          </View>
        </View>
      );

    case 'calendar':
      return (
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <AppText className="font-nunito-bold text-sm text-slate-900">Semaine</AppText>
            <AppText className="font-nunito-semibold text-xs text-primary-700">Juin</AppText>
          </View>
          <View className="flex-row gap-1.5">
            {['L', 'M', 'M', 'J', 'V'].map((day, i) => (
              <View key={`${day}-${i}`} className="flex-1 items-center gap-1">
                <AppText className="font-nunito text-2xs text-slate-400">{day}</AppText>
                <View
                  className={`h-9 w-full items-center justify-center rounded-xl ${
                    i === 2 ? 'bg-primary' : 'border border-slate-100 bg-slate-50'
                  }`}
                >
                  <AppText
                    className={`font-nunito-bold text-xs ${i === 2 ? 'text-white' : 'text-slate-600'}`}
                  >
                    {10 + i}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
          <FeatureRow
            avatar="09"
            title="Soin à domicile"
            subtitle="M. Dupont · 45 min"
            pill={{ label: 'Planifié', tone: 'primary' }}
            accent
          />
        </View>
      );

    case 'patients':
      return (
        <View className="gap-3">
          <View className="flex-row items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5">
            <AppText className="text-sm">🔍</AppText>
            <AppText className="font-nunito text-xs text-slate-400">Rechercher un patient…</AppText>
          </View>
          <FeatureRow avatar="JD" title="Jean Dupont" subtitle="Dernière visite · hier" accent />
          <FeatureRow avatar="MC" title="Marie Claire" subtitle="Suivi post-opératoire" />
        </View>
      );

    case 'qr':
      return (
        <View className="items-center gap-4">
          <View className="relative">
            <View className="absolute -left-2 -top-2 h-6 w-6 rounded-tl-lg border-l-[3px] border-t-[3px] border-primary" />
            <View className="absolute -right-2 -top-2 h-6 w-6 rounded-tr-lg border-r-[3px] border-t-[3px] border-primary" />
            <View className="absolute -bottom-2 -left-2 h-6 w-6 rounded-bl-lg border-b-[3px] border-l-[3px] border-primary" />
            <View className="absolute -bottom-2 -right-2 h-6 w-6 rounded-br-lg border-b-[3px] border-r-[3px] border-primary" />
            <View className="rounded-2xl border border-slate-100 bg-white p-4">
              <View className="flex-row flex-wrap gap-1" style={{ width: 104 }}>
                {Array.from({ length: 49 }).map((_, i) => (
                  <View
                    key={i}
                    className={`h-3 w-3 rounded-[2px] ${
                      [0, 1, 2, 6, 7, 8, 14, 16, 20, 22, 28, 30, 34, 36, 42, 43, 44, 48].includes(i)
                        ? 'bg-slate-900'
                        : 'bg-slate-100'
                    }`}
                  />
                ))}
              </View>
            </View>
          </View>
          <View className="items-center gap-1">
            <AppText className="font-nunito-bold text-sm text-slate-900">Scanner le patient</AppText>
            <AppText className="font-nunito text-xs text-slate-500">Identification rapide sur place</AppText>
          </View>
        </View>
      );

    case 'prescriptions':
      return (
        <View className="gap-3">
          <View className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <AppText className="font-nunito-bold text-xs text-slate-700">Ordonnance</AppText>
              <StatusPill label="Validée" tone="success" />
            </View>
            <View className="gap-2">
              <View className="h-2 w-full rounded-full bg-primary-100" />
              <View className="h-2 w-[90%] rounded-full bg-slate-200" />
              <View className="h-2 w-[75%] rounded-full bg-slate-200" />
              <View className="mt-1 h-8 w-[45%] rounded-lg border border-dashed border-slate-300" />
            </View>
          </View>
          <View className="flex-row items-center gap-2.5 rounded-2xl border border-primary-200 bg-primary-50 p-3">
            <View className="h-8 w-8 items-center justify-center rounded-full bg-primary">
              <AppText className="font-nunito-bold text-xs text-white">✓</AppText>
            </View>
            <AppText className="font-nunito-semibold text-xs text-primary-800">Envoyée au patient</AppText>
          </View>
        </View>
      );

    case 'tournee':
      return (
        <View className="gap-3">
          <View className="overflow-hidden rounded-2xl border border-primary-100 bg-primary-50">
            <View className="h-[72px] justify-end p-3">
              <View className="absolute left-8 top-5 h-3 w-3 rounded-full border-2 border-white bg-primary" />
              <View className="absolute left-[52px] top-8 h-0.5 w-16 rotate-[25deg] bg-primary-300" />
              <View className="absolute right-10 top-4 h-3 w-3 rounded-full border-2 border-white bg-primary-400" />
              <View className="h-1.5 w-full rounded-full bg-primary-200" />
            </View>
          </View>
          <FeatureRow
            avatar="→"
            title="Prochain passage"
            subtitle="10h30 · M. Martin · 1,2 km"
            pill={{ label: 'Dans 25 min', tone: 'primary' }}
            accent
          />
          <View className="flex-row gap-2">
            {['Carte', 'Itinéraire', 'Appeler'].map((action, i) => (
              <View
                key={action}
                className={`flex-1 items-center rounded-xl py-2 ${
                  i === 1 ? 'bg-primary' : 'border border-slate-200 bg-white'
                }`}
              >
                <AppText
                  className={`font-nunito-semibold text-2xs ${i === 1 ? 'text-white' : 'text-slate-600'}`}
                >
                  {action}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      );

    default:
      return null;
  }
}

export function TutorialIllustration({ illustration }: Props) {
  return (
    <IllustrationCanvas>
      <IllustrationBody illustration={illustration} />
    </IllustrationCanvas>
  );
}

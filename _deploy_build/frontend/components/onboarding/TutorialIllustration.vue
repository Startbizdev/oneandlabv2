<script setup lang="ts">
import type { TutorialIllustrationKey } from '@oneandlab/onboarding'

defineProps<{
  illustration: TutorialIllustrationKey
}>()

const QR_DARK = new Set([0, 1, 2, 6, 7, 8, 14, 16, 20, 22, 28, 30, 34, 36, 42, 43, 44, 48])
</script>

<template>
  <div class="relative mx-auto w-full max-w-[300px] self-center">
    <div class="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
      <div class="h-[120px] w-[120px] rounded-full bg-primary-50 opacity-90" />
    </div>
    <div class="pointer-events-none absolute -left-2 top-6 h-[88px] w-[88px] rounded-full bg-primary-100 opacity-70" />
    <div class="pointer-events-none absolute -right-1 bottom-4 h-[56px] w-[56px] rounded-full bg-primary-200 opacity-45" />

    <div class="relative overflow-hidden rounded-3xl border border-primary-100/80 bg-white px-5 py-6 shadow-md">
      <!-- welcome -->
      <div v-if="illustration === 'welcome'" class="flex flex-col items-center gap-5">
        <div class="relative">
          <div class="absolute -inset-2 rounded-full bg-primary-100 opacity-60" />
          <div
            class="relative flex h-[88px] w-[88px] items-center justify-center rounded-full bg-gradient-to-br from-secondary-400 via-primary-500 to-secondary-600 shadow-sm"
          >
            <span class="text-4xl font-black text-white">C</span>
          </div>
          <div class="absolute -right-1 -top-1 h-5 w-5 rounded-full border-2 border-white bg-warning-500" />
        </div>
        <div class="flex flex-col items-center gap-2">
          <div class="h-3 w-[140px] rounded-full bg-primary-100" />
          <div class="h-2.5 w-[100px] rounded-full bg-slate-200" />
        </div>
        <div class="flex flex-wrap justify-center gap-2">
          <span
            v-for="tag in ['Soins', 'RDV', 'Proches']"
            :key="tag"
            class="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-[10px] font-semibold text-primary-800"
          >
            {{ tag }}
          </span>
        </div>
      </div>

      <!-- appointments -->
      <div v-else-if="illustration === 'appointments'" class="flex flex-col gap-3">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-bold text-slate-900">Mes rendez-vous</span>
          <span
            class="rounded-full border border-primary-200 bg-primary-50 px-2.5 py-0.5 text-[10px] font-semibold text-primary-800"
          >
            2 à venir
          </span>
        </div>
        <div class="flex items-center gap-3 rounded-2xl border border-primary-200 bg-primary-50/80 p-3.5">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-xl">🩹</div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold text-slate-900">Pansement</p>
            <p class="truncate text-xs text-slate-500">Demain · 14h30 · Domicile</p>
          </div>
          <span class="rounded-full border border-success-200 bg-success-50 px-2.5 py-0.5 text-[10px] font-semibold text-success-700">
            Confirmé
          </span>
        </div>
        <div class="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl">🧪</div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold text-slate-900">Prélèvement</p>
            <p class="truncate text-xs text-slate-500">Vendredi · 09h00</p>
          </div>
          <span class="rounded-full border border-warning-200 bg-warning-50 px-2.5 py-0.5 text-[10px] font-semibold text-warning-700">
            En attente
          </span>
        </div>
      </div>

      <!-- book -->
      <div v-else-if="illustration === 'book'" class="flex flex-col gap-4">
        <span class="text-sm font-bold text-slate-900">Choisir un soin</span>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="item in [
              { emoji: '🩹', label: 'Pansement', active: true },
              { emoji: '🧪', label: 'Prélèvement', active: false },
              { emoji: '💗', label: 'Suivi', active: false },
            ]"
            :key="item.label"
            class="flex flex-col items-center rounded-2xl border px-3 py-2.5"
            :class="item.active ? 'border-primary-500 bg-primary-50' : 'border-slate-100 bg-slate-50'"
          >
            <span class="text-xl">{{ item.emoji }}</span>
            <span
              class="mt-1 text-[10px] font-semibold"
              :class="item.active ? 'text-primary-800' : 'text-slate-500'"
            >
              {{ item.label }}
            </span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div v-for="step in 3" :key="step" class="h-1.5 flex-1 rounded-full" :class="step <= 2 ? 'bg-primary-500' : 'bg-slate-200'" />
        </div>
        <div class="rounded-xl bg-primary-600 py-3 text-center text-sm font-bold text-white">
          Continuer la réservation
        </div>
      </div>

      <!-- relatives -->
      <div v-else-if="illustration === 'relatives'" class="flex flex-col gap-3">
        <span class="text-sm font-bold text-slate-900">Mes proches</span>
        <div class="flex items-center gap-3 rounded-2xl border border-primary-200 bg-primary-50/80 p-3.5">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-600 text-sm font-bold text-white">M</div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold text-slate-900">Marie Dupont</p>
            <p class="truncate text-xs text-slate-500">Enfant · Carte Vitale à jour</p>
          </div>
          <span class="rounded-full border border-success-200 bg-success-50 px-2.5 py-0.5 text-[10px] font-semibold text-success-700">
            Actif
          </span>
        </div>
        <div class="flex items-center gap-3 rounded-2xl border border-dashed border-primary-200 bg-primary-50/50 p-3.5">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary-200 bg-white text-lg">📄</div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-bold text-slate-900">Documents</p>
            <p class="text-xs text-slate-500">Ordonnance · Mutuelle</p>
          </div>
          <div class="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">+</div>
        </div>
      </div>

      <!-- ai -->
      <div v-else-if="illustration === 'ai'" class="flex flex-col gap-3">
        <div class="max-w-[88%] self-start">
          <div class="mb-1 flex items-center gap-1.5">
            <div class="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[10px] font-black text-white">C</div>
            <span class="text-[10px] font-semibold text-primary-700">Cary</span>
          </div>
          <div class="rounded-2xl rounded-tl-sm border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-xs leading-[18px] text-slate-700">
            Bonjour ! Comment puis-je vous aider pour votre prochain soin ?
          </div>
        </div>
        <div class="max-w-[88%] self-end rounded-2xl rounded-tr-sm bg-primary-600 px-3.5 py-2.5 text-xs leading-[18px] text-white">
          Je voudrais prendre un RDV pour ma mère
        </div>
        <div class="max-w-[88%] self-start rounded-2xl rounded-tl-sm border border-primary-100 bg-primary-50 px-3.5 py-2.5">
          <div class="mb-1 flex items-center gap-1 text-xs">✨ <span class="text-[10px] font-semibold text-primary-700">Suggestion Cary</span></div>
          <p class="text-xs leading-[18px] text-slate-700">Pansement à domicile demain 14h — voulez-vous confirmer ?</p>
        </div>
      </div>

      <!-- notifications -->
      <div v-else-if="illustration === 'notifications'" class="flex flex-col gap-4">
        <div class="flex items-center gap-3">
          <div class="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-xl">🔔
            <div class="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-error-500" />
          </div>
          <div>
            <p class="text-sm font-bold text-slate-900">Notifications</p>
            <p class="text-xs text-slate-500">Restez informé en temps réel</p>
          </div>
        </div>
        <div class="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
          <div class="flex items-start gap-2.5">
            <div class="mt-0.5 h-2 w-2 rounded-full bg-primary-500" />
            <div>
              <p class="text-xs font-bold text-slate-900">RDV confirmé</p>
              <p class="text-[10px] leading-4 text-slate-500">Votre pansement est prévu demain à 14h30</p>
            </div>
          </div>
          <div class="h-px bg-slate-200" />
          <div class="flex items-start gap-2.5 opacity-70">
            <div class="mt-0.5 h-2 w-2 rounded-full bg-slate-300" />
            <div>
              <p class="text-xs font-semibold text-slate-700">Rappel J-1</p>
              <p class="text-[10px] text-slate-400">Envoyé la veille du soin</p>
            </div>
          </div>
        </div>
      </div>

      <!-- demandes -->
      <div v-else-if="illustration === 'demandes'" class="flex flex-col gap-3">
        <div class="flex items-center gap-3 rounded-2xl border border-primary-200 bg-primary-50/80 p-3.5">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-600 text-xl">📍</div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold text-slate-900">Nouvelle demande</p>
            <p class="truncate text-xs text-slate-500">Pansement · 2 km · Aujourd'hui</p>
          </div>
          <span class="rounded-full border border-warning-200 bg-warning-50 px-2.5 py-0.5 text-[10px] font-semibold text-warning-700">
            Urgent
          </span>
        </div>
        <div class="rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <div class="mb-2 flex items-center gap-2">
            <div class="h-8 w-8 rounded-full bg-primary-100" />
            <div class="h-2 flex-1 rounded-full bg-slate-200" />
          </div>
          <div class="h-16 rounded-xl border border-primary-100 bg-primary-50/60" />
        </div>
        <div class="flex gap-2.5">
          <div class="flex-1 rounded-xl bg-primary-600 py-2.5 text-center text-xs font-bold text-white">Accepter</div>
          <div class="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-center text-xs font-semibold text-slate-600">Refuser</div>
        </div>
      </div>

      <!-- calendar -->
      <div v-else-if="illustration === 'calendar'" class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-bold text-slate-900">Semaine</span>
          <span class="text-xs font-semibold text-primary-700">Juin</span>
        </div>
        <div class="flex gap-1.5">
          <div v-for="(day, i) in ['L', 'M', 'M', 'J', 'V']" :key="`${day}-${i}`" class="flex flex-1 flex-col items-center gap-1">
            <span class="text-[10px] text-slate-400">{{ day }}</span>
            <div
              class="flex h-9 w-full items-center justify-center rounded-xl text-xs font-bold"
              :class="i === 2 ? 'bg-primary-600 text-white' : 'border border-slate-100 bg-slate-50 text-slate-600'"
            >
              {{ 10 + i }}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3 rounded-2xl border border-primary-200 bg-primary-50/80 p-3.5">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-600 text-sm font-bold text-white">09</div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold text-slate-900">Soin à domicile</p>
            <p class="truncate text-xs text-slate-500">M. Dupont · 45 min</p>
          </div>
          <span class="rounded-full border border-primary-200 bg-primary-50 px-2.5 py-0.5 text-[10px] font-semibold text-primary-800">
            Planifié
          </span>
        </div>
      </div>

      <!-- patients -->
      <div v-else-if="illustration === 'patients'" class="flex flex-col gap-3">
        <div class="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm">
          🔍 <span class="text-xs text-slate-400">Rechercher un patient…</span>
        </div>
        <div class="flex items-center gap-3 rounded-2xl border border-primary-200 bg-primary-50/80 p-3.5">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-600 text-sm font-bold text-white">JD</div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold text-slate-900">Jean Dupont</p>
            <p class="truncate text-xs text-slate-500">Dernière visite · hier</p>
          </div>
        </div>
        <div class="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-600">MC</div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold text-slate-900">Marie Claire</p>
            <p class="truncate text-xs text-slate-500">Suivi post-opératoire</p>
          </div>
        </div>
      </div>

      <!-- qr -->
      <div v-else-if="illustration === 'qr'" class="flex flex-col items-center gap-4">
        <div class="relative">
          <div class="absolute -left-2 -top-2 h-6 w-6 rounded-tl-lg border-l-[3px] border-t-[3px] border-primary-500" />
          <div class="absolute -right-2 -top-2 h-6 w-6 rounded-tr-lg border-r-[3px] border-t-[3px] border-primary-500" />
          <div class="absolute -bottom-2 -left-2 h-6 w-6 rounded-bl-lg border-b-[3px] border-l-[3px] border-primary-500" />
          <div class="absolute -bottom-2 -right-2 h-6 w-6 rounded-br-lg border-b-[3px] border-r-[3px] border-primary-500" />
          <div class="rounded-2xl border border-slate-100 bg-white p-4">
            <div class="grid w-[104px] grid-cols-7 gap-1">
              <div
                v-for="i in 49"
                :key="i - 1"
                class="h-3 w-3 rounded-[2px]"
                :class="QR_DARK.has(i - 1) ? 'bg-slate-900' : 'bg-slate-100'"
              />
            </div>
          </div>
        </div>
        <div class="text-center">
          <p class="text-sm font-bold text-slate-900">Scanner le patient</p>
          <p class="text-xs text-slate-500">Identification rapide sur place</p>
        </div>
      </div>

      <!-- prescriptions -->
      <div v-else-if="illustration === 'prescriptions'" class="flex flex-col gap-3">
        <div class="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div class="mb-3 flex items-center justify-between">
            <span class="text-xs font-bold text-slate-700">Ordonnance</span>
            <span class="rounded-full border border-success-200 bg-success-50 px-2.5 py-0.5 text-[10px] font-semibold text-success-700">
              Validée
            </span>
          </div>
          <div class="flex flex-col gap-2">
            <div class="h-2 w-full rounded-full bg-primary-100" />
            <div class="h-2 w-[90%] rounded-full bg-slate-200" />
            <div class="h-2 w-[75%] rounded-full bg-slate-200" />
            <div class="mt-1 h-8 w-[45%] rounded-lg border border-dashed border-slate-300" />
          </div>
        </div>
        <div class="flex items-center gap-2.5 rounded-2xl border border-primary-200 bg-primary-50 p-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">✓</div>
          <span class="text-xs font-semibold text-primary-800">Envoyée au patient</span>
        </div>
      </div>

      <!-- tournee -->
      <div v-else-if="illustration === 'tournee'" class="flex flex-col gap-3">
        <div class="relative overflow-hidden rounded-2xl border border-primary-100 bg-primary-50">
          <div class="relative h-[72px] p-3">
            <div class="absolute left-8 top-5 h-3 w-3 rounded-full border-2 border-white bg-primary-500" />
            <div class="absolute left-[52px] top-8 h-0.5 w-16 rotate-[25deg] bg-primary-300" />
            <div class="absolute right-10 top-4 h-3 w-3 rounded-full border-2 border-white bg-primary-400" />
            <div class="absolute bottom-3 left-3 right-3 h-1.5 rounded-full bg-primary-200" />
          </div>
        </div>
        <div class="flex items-center gap-3 rounded-2xl border border-primary-200 bg-primary-50/80 p-3.5">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-600 text-sm font-bold text-white">→</div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold text-slate-900">Prochain passage</p>
            <p class="truncate text-xs text-slate-500">10h30 · M. Martin · 1,2 km</p>
          </div>
          <span class="rounded-full border border-primary-200 bg-primary-50 px-2.5 py-0.5 text-[10px] font-semibold text-primary-800">
            Dans 25 min
          </span>
        </div>
        <div class="flex gap-2">
          <div
            v-for="(action, i) in ['Carte', 'Itinéraire', 'Appeler']"
            :key="action"
            class="flex-1 rounded-xl py-2 text-center text-[10px] font-semibold"
            :class="i === 1 ? 'bg-primary-600 text-white' : 'border border-slate-200 bg-white text-slate-600'"
          >
            {{ action }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

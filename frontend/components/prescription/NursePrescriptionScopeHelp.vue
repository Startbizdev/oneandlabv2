<template>
  <div
    class="rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
    role="region"
    aria-label="Aide prescription infirmière"
  >
    <div class="flex gap-3 min-w-0 flex-1">
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"
        aria-hidden="true"
      >
        <UIcon name="i-lucide-scale" class="w-5 h-5" />
      </div>
      <div class="min-w-0 space-y-1">
        <p class="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
          Que puis-je prescrire en tant qu’infirmier ?
        </p>
        <p class="text-xs text-muted leading-relaxed">
          Liste réglementaire (L4311-1, arrêté 2026), limites et usage dans Cary.
        </p>
      </div>
    </div>
    <UButton
      size="sm"
      color="primary"
      variant="soft"
      class="shrink-0 self-start sm:self-center"
      icon="i-lucide-book-open"
      @click="open = true"
    >
      Voir la liste
    </UButton>
  </div>

  <UModal
    v-model:open="open"
    :ui="{
      content: 'max-w-2xl w-[calc(100vw-1.5rem)] sm:w-full',
      body: 'p-0 sm:p-0',
    }"
  >
    <template #header>
      <div class="space-y-1 pr-8">
        <p class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ scope.modalTitle }}
        </p>
        <p class="text-sm text-muted font-normal">
          {{ scope.modalSubtitle }}
        </p>
      </div>
    </template>

    <template #body>
      <div class="max-h-[min(72vh,640px)] overflow-y-auto overscroll-contain px-4 sm:px-6 pb-6 space-y-6">
        <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {{ scope.intro }}
        </p>

        <div
          class="rounded-lg border border-sky-200/80 dark:border-sky-800/50 bg-sky-50/90 dark:bg-sky-950/30 px-4 py-3.5 flex gap-3"
        >
          <UIcon name="i-lucide-info" class="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <p class="text-xs sm:text-sm text-sky-950 dark:text-sky-100 leading-relaxed">
            {{ scope.caryNotice }}
          </p>
        </div>

        <section class="space-y-3">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-muted">
            Domaines autorisés
          </h3>
          <UAccordion
            :items="accordionItems"
            type="multiple"
            :ui="accordionUi"
          >
            <template #default="{ item }">
              <span class="text-sm font-medium text-gray-900 dark:text-white">{{ item.label }}</span>
            </template>
            <template #content="{ item }">
              <p class="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
                {{ item.content }}
              </p>
            </template>
          </UAccordion>
        </section>

        <section class="space-y-3">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-muted">
            Règles essentielles
          </h3>
          <ul class="space-y-3">
            <li
              v-for="rule in scope.keyRules"
              :key="rule.id"
              class="rounded-lg border border-default/60 bg-muted/20 px-4 py-3"
            >
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ rule.title }}</p>
              <p class="text-xs text-muted mt-1 leading-relaxed">{{ rule.body }}</p>
            </li>
          </ul>
        </section>

        <section class="space-y-3">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-muted">
            Textes officiels et références
          </h3>
          <ul class="space-y-2">
            <li
              v-for="src in scope.legalSources"
              :key="src.id"
              class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4 rounded-lg border border-default/50 px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ src.label }}</p>
                <p v-if="src.note" class="text-xs text-muted mt-0.5">{{ src.note }}</p>
                <p class="text-[11px] text-muted mt-1">
                  {{ src.publisher }}
                  <span v-if="src.publishedAt"> · {{ src.publishedAt }}</span>
                </p>
              </div>
              <UButton
                :to="src.url"
                target="_blank"
                rel="noopener noreferrer"
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-external-link"
                class="shrink-0 self-start"
              >
                Ouvrir
              </UButton>
            </li>
          </ul>
        </section>

        <p class="text-[11px] text-muted leading-relaxed border-t border-default/50 pt-4">
          {{ scope.disclaimer }}
          <span class="block mt-2 text-muted/80">
            Contenu Cary · révision {{ scope.version }} · maj. {{ formattedUpdatedAt }}
          </span>
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <UButton color="neutral" variant="soft" @click="open = false">
          Fermer
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import {
  NURSE_PRESCRIPTION_SCOPE,
  nursePrescriptionScopeAccordionItems,
} from '@oneandlab/shared-utils';

const open = ref(false);
const scope = NURSE_PRESCRIPTION_SCOPE;
const accordionItems = nursePrescriptionScopeAccordionItems(scope);

const formattedUpdatedAt = computed(() => {
  try {
    return new Date(scope.updatedAt).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return scope.updatedAt;
  }
});

const accordionUi = {
  root: 'space-y-2',
  item: {
    base: 'border border-default/60 rounded-xl overflow-hidden bg-default/40',
    padding: 'p-0',
  },
  trigger: {
    base: 'flex items-center justify-between w-full text-left px-4 py-3.5 hover:bg-muted/40 transition-colors',
    padding: 'p-0',
  },
  content: {
    base: 'px-4 pb-4 pt-0 border-t border-default/40',
    padding: 'pt-3',
  },
};
</script>

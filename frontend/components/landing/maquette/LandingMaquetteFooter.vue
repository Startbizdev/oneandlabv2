<template>
  <footer class="landing-footer relative overflow-hidden text-white/[0.88]">
    <span class="landing-footer-pattern" aria-hidden="true" />

    <div class="relative z-[2]">
      <div
        class="landing-footer-inner mx-auto max-w-[1200px] px-6 pb-14 pt-[clamp(56px,8vw,96px)] lg:px-12"
      >
        <div
          class="flex flex-col gap-8 border-b border-white/[0.08] pb-[clamp(40px,6vw,64px)] lg:gap-11"
        >
          <div class="flex flex-wrap gap-3">
            <a
              v-for="soc in socials"
              :key="soc.label"
              :href="soc.href"
              class="flex h-12 w-12 items-center justify-center rounded-xl border border-white/14 bg-white/[0.07] text-white/75 transition-all hover:-translate-y-px hover:border-white/28 hover:bg-white/14 hover:text-white"
              :aria-label="soc.label"
              target="_blank"
              rel="noopener noreferrer"
            >
              <UIcon :name="soc.icon" class="h-[22px] w-[22px]" />
            </a>
          </div>

          <nav
            class="grid w-full grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-[72px]"
            aria-label="Liens du pied de page"
          >
            <div v-for="block in footerBlocks" :key="block.title">
              <h4 class="mb-[22px] text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">
                {{ block.title }}
              </h4>
              <ul class="m-0 flex list-none flex-col gap-3 p-0">
                <li v-for="link in block.links" :key="link.label + link.to">
                  <NuxtLink
                    v-if="!link.external"
                    :to="link.to"
                    class="text-sm font-medium text-white/55 transition-colors hover:text-white"
                  >
                    {{ link.label }}
                  </NuxtLink>
                  <a
                    v-else
                    :href="link.to"
                    class="text-sm font-medium text-white/55 transition-colors hover:text-white"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {{ link.label }}
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div class="pt-[22px] pb-[clamp(80px,14vw,140px)]">
          <div
            class="flex flex-col items-start justify-between gap-4 text-[0.8125rem] text-white/32 sm:flex-row sm:items-center"
          >
            <span>© {{ year }} Cary · Données de santé hébergées, conforme RGPD.</span>
            <div class="flex flex-wrap gap-x-[22px] gap-y-2">
              <NuxtLink
                to="/politique-confidentialite"
                class="text-white/38 transition-colors hover:text-white/75"
              >
                Confidentialité
              </NuxtLink>
              <NuxtLink to="/cgv" class="text-white/38 transition-colors hover:text-white/75">
                Conditions d'utilisation
              </NuxtLink>
              <NuxtLink
                to="/mentions-legales"
                class="text-white/38 transition-colors hover:text-white/75"
              >
                Mentions légales
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      class="landing-footer-watermark pointer-events-none select-none"
      aria-hidden="true"
    >
      <span class="landing-footer-watermark-text">Cary</span>
    </div>
  </footer>
</template>

<script setup lang="ts">
const { appointmentNewUrl } = useAppointmentNewUrl();
const year = new Date().getFullYear();

const socials = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com', icon: 'i-lucide-linkedin' },
  { label: 'Instagram', href: 'https://www.instagram.com', icon: 'i-lucide-instagram' },
  { label: 'Facebook', href: 'https://www.facebook.com', icon: 'i-lucide-facebook' },
] as const;

const footerBlocks = computed(() => {
  const rdv = appointmentNewUrl.value;
  const nursingQ = rdv === '/rendez-vous/nouveau' ? '?type=nursing' : '';
  const bloodQ = rdv === '/rendez-vous/nouveau' ? '?type=blood_test' : '';
  return [
    {
    title: 'Services',
    links: [
      { label: 'Soins infirmiers', to: `${rdv}${nursingQ}`, external: false },
      { label: 'Prise de sang à domicile', to: `${rdv}${bloodQ}`, external: false },
      { label: 'Pour les patients', to: '/pour-les-patients', external: false },
      { label: 'Comment réserver', to: `${rdv}`, external: false },
    ],
  },
  {
    title: 'Professionnels',
    links: [
      { label: 'Infirmiers', to: '/pour-les-infirmiers', external: false },
      { label: 'Laboratoires', to: '/pour-les-laboratoires', external: false },
      { label: 'Devenir infirmier', to: '/nurse/register', external: false },
      { label: 'Espace médecin', to: '/pour-les-professionnels', external: false },
    ],
  },
  {
    title: 'Aide',
    links: [
      { label: 'Contact', to: '/contact', external: false },
      { label: 'Questions fréquentes', to: '/#faq', external: false },
      { label: 'Nous écrire', to: '/contact', external: false },
    ],
  },
  ];
});
</script>

<style scoped>
.landing-footer {
  background: linear-gradient(
    180deg,
    #1cc7b5 0%,
    #18b5a5 14%,
    #16b6d6 32%,
    #1299b8 52%,
    #0c6478 72%,
    #084352 88%,
    #030508 96%,
    #000000 100%
  );
}
.landing-footer::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: min(22%, 200px);
  max-height: 220px;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 0.15) 40%,
    rgba(0, 0, 0, 0.55) 78%,
    rgba(0, 0, 0, 0.92) 100%
  );
  pointer-events: none;
  z-index: 0;
}
.landing-footer-pattern {
  position: absolute;
  inset: 0;
  z-index: 0;
  opacity: 0.22;
  background-color: transparent;
  background-image: linear-gradient(rgba(255, 255, 255, 0.14) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.14) 1px, transparent 1px);
  background-size: 22px 22px;
  pointer-events: none;
}
.landing-footer-watermark {
  position: relative;
  z-index: 1;
  height: clamp(100px, 18vw, 220px);
  margin-top: clamp(-112px, -14vw, -80px);
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.landing-footer-watermark-text {
  display: block;
  font-size: clamp(4rem, 21vw, 17rem);
  font-weight: 800;
  letter-spacing: 0.08em;
  line-height: 0.72;
  color: rgba(255, 255, 255, 0.5);
  transform: translateY(26%);
  text-align: center;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .landing-footer-watermark {
    height: clamp(72px, 22vw, 120px);
    margin-top: -64px;
  }
}
</style>

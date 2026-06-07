<template>
  <section id="plateforme" class="pb-[72px] lg:pb-[100px]">
    <div class="mx-auto max-w-[1200px] px-6 lg:px-12">
      <div class="mb-10 grid gap-8 lg:mb-10 lg:grid-cols-[1fr_min(42%,360px)] lg:items-center lg:gap-10">
        <div class="max-w-[640px]">
          <span
            class="mb-4 inline-block text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-500"
          >
            Notre plateforme
          </span>
          <h2
            class="mb-3 text-[clamp(1.875rem,2.5vw,2.625rem)] font-extrabold leading-[1.1] tracking-[-0.035em] text-[#0A0A0F] dark:text-white"
          >
            Un réseau, chaque profil
          </h2>
          <p class="mt-2 text-base leading-relaxed text-[#3D3D52] dark:text-gray-300">
            Infirmiers, laboratoires, médecins et patients : un parcours dédié par rôle.
          </p>
        </div>
        <div
          class="relative aspect-[4/3] w-full max-w-[360px] overflow-hidden rounded-[22px] border border-[#E8E8F0] lg:max-w-none lg:justify-self-end dark:border-gray-800"
        >
          <img
            src="/images/landing/landing-platform-network.svg"
            alt="Réseau Cary : infirmiers, laboratoires, médecins et patients"
            width="800"
            height="600"
            class="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div
            class="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary-500/20 via-transparent to-transparent"
            aria-hidden="true"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-10 lg:gap-5">
        <LandingMaquetteBentoCard
          class="lg:col-span-4 lg:row-start-1"
          image="/images/landing/landing-bento-nurse.png"
        >
          <template #heading>
            <span class="inline-flex items-center gap-2">
              <UIcon name="i-lucide-syringe" class="h-4 w-4 text-white/72" />
              <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-white/58"
                >Infirmiers</span
              >
            </span>
            <span class="text-xl font-extrabold tracking-[-0.03em] text-white md:text-[1.25rem]"
              >Rejoignez le réseau</span
            >
          </template>
          <template #lead> Plus de missions près de chez vous, sans engagement. </template>
          <template #actions>
            <NuxtLink
              to="/nurse/register"
              class="inline-flex min-h-9 items-center justify-center rounded-md border border-transparent bg-primary-500 px-4 py-2 text-sm font-medium text-white shadow-[0_1px_2px_0_rgb(15_23_42_/_0.06)] transition-all hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
            >
              Rejoindre le réseau
            </NuxtLink>
          </template>
        </LandingMaquetteBentoCard>

        <LandingMaquetteBentoCard
          class="lg:col-span-6 lg:row-start-1"
          image="/images/landing/landing-bento-lab.jpg"
        >
          <template #heading>
            <span class="inline-flex items-center gap-2">
              <UIcon name="i-lucide-flask-conical" class="h-4 w-4 text-white/72" />
              <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-white/58"
                >Laboratoires</span
              >
            </span>
            <span class="text-xl font-extrabold tracking-[-0.03em] text-white md:text-[1.25rem]"
              >Prélèvements pilotés</span
            >
          </template>
          <template #lead>
            Une console pour vos équipes et la conformité HDS.
          </template>
          <template #actions>
            <NuxtLink
              to="/lab/register"
              class="inline-flex min-h-9 items-center justify-center rounded-md border border-transparent bg-primary-500 px-4 py-2 text-sm font-medium text-white shadow-[0_1px_2px_0_rgb(15_23_42_/_0.06)] transition-all hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
            >
              Inscrire mon labo
            </NuxtLink>
          </template>
        </LandingMaquetteBentoCard>

        <article
          ref="statCardEl"
          class="lg:col-span-2 lg:row-start-2 relative isolate flex flex-col justify-end overflow-hidden rounded-[22px] bg-primary-500 px-4 py-6 text-white shadow-[0_6px_32px_rgba(28,199,181,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(28,199,181,0.45)] lg:pb-5 lg:pl-5 lg:pr-5 lg:pt-6"
        >
          <div
            class="absolute inset-0 z-0 rounded-[inherit] opacity-55 bg-[linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] bg-[length:20px_20px] pointer-events-none"
          />
          <div class="relative z-[3] flex w-full flex-col items-start">
            <div
              class="mb-2 flex items-baseline gap-1 font-black leading-none tracking-[-0.05em] text-[clamp(1.85rem,2.2vw+0.5rem,2.75rem)]"
            >
              <span>{{ displayCount }}</span>
              <sup class="mt-1 align-top text-[45%] font-extrabold">+</sup>
            </div>
            <p class="mb-4 max-w-none text-xs leading-snug text-white/82">
              Professionnels certifiés
            </p>
            <NuxtLink
              to="/infirmiers"
              class="inline-flex w-auto max-w-full items-center gap-[7px] rounded-md bg-white/18 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/28 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
            >
              Voir le réseau
              <UIcon name="i-lucide-arrow-right" class="h-[15px] w-[15px]" />
            </NuxtLink>
          </div>
        </article>

        <LandingMaquetteBentoCard
          class="lg:col-span-4 lg:row-start-2"
          image="/images/landing/landing-bento-patient.jpg"
        >
          <template #heading>
            <span class="inline-flex items-center gap-2">
              <UIcon name="i-lucide-heart-pulse" class="h-4 w-4 text-white/72" />
              <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-white/58"
                >Patients</span
              >
            </span>
            <span class="text-xl font-extrabold tracking-[-0.03em] text-white md:text-[1.25rem]"
              >Soins à domicile</span
            >
          </template>
          <template #lead> Qualité d'un cabinet, confort de votre foyer. </template>
          <template #actions>
            <NuxtLink
              :to="appointmentNewUrl"
              class="inline-flex min-h-9 items-center justify-center rounded-md border border-transparent bg-primary-500 px-4 py-2 text-sm font-medium text-white shadow-[0_1px_2px_0_rgb(15_23_42_/_0.06)] transition-all hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
            >
              Prendre rendez-vous
            </NuxtLink>
          </template>
        </LandingMaquetteBentoCard>

        <LandingMaquetteBentoCard
          class="lg:col-span-4 lg:row-start-2"
          image="/images/landing/landing-bento-pro.jpg"
        >
          <template #heading>
            <span class="inline-flex items-center gap-2">
              <UIcon name="i-lucide-stethoscope" class="h-4 w-4 text-white/72" />
              <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-white/58"
                >Médecins &amp; pros</span
              >
            </span>
            <span class="text-xl font-extrabold tracking-[-0.03em] text-white md:text-[1.25rem]"
              >Orienter vers le domicile</span
            >
          </template>
          <template #lead>
            Moins d'administratif, suivi des soins simplifié.
          </template>
          <template #actions>
            <NuxtLink
              to="/pour-les-professionnels"
              class="inline-flex min-h-9 items-center justify-center rounded-md border border-transparent bg-primary-500 px-4 py-2 text-sm font-medium text-white shadow-[0_1px_2px_0_rgb(15_23_42_/_0.06)] transition-all hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
            >
              Espace pro
            </NuxtLink>
          </template>
        </LandingMaquetteBentoCard>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const { appointmentNewUrl } = useAppointmentNewUrl();

const statCardEl = ref<HTMLElement | null>(null);
const displayCount = ref('0');
const TARGET = 500;

function animateCount(target: number, duration = 1400) {
  const el = displayCount;
  const start = performance.now();
  const fmt = (n: number) =>
    n >= 1000 ? new Intl.NumberFormat('fr-FR').format(n) : String(n);
  const tick = (now: number) => {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - (1 - p) ** 3;
    el.value = fmt(Math.round(ease * target));
    if (p < 1) requestAnimationFrame(tick);
    else el.value = fmt(target);
  };
  requestAnimationFrame(tick);
}

let observer: IntersectionObserver | null = null;

onMounted(() => {
  const node = statCardEl.value;
  if (!node) return;
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        observer?.unobserve(e.target);
        animateCount(TARGET);
      });
    },
    { threshold: 0.5 },
  );
  observer.observe(node);
});

onUnmounted(() => {
  observer?.disconnect();
});
</script>

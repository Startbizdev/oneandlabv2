/**
 * Marque <html data-hydrated> une fois l'app Vue interactive (utilisé par les e2e).
 */
export default defineNuxtPlugin(() => {
  onNuxtReady(() => {
    document.documentElement.dataset.hydrated = 'true';
  });
});

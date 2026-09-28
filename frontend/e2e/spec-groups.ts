/** Specs qui exigent le build de production + l'API synthétique (voir `playwright.ssr.config.ts`). */
export const ssrSpecs = [
  '**/public-directory.spec.ts',
  '**/public-profile.spec.ts',
  '**/public-entrypoints.spec.ts',
];

/** Specs sans mocks contre l'API PHP réelle + MySQL jetable (voir `playwright.live.config.ts`). */
export const liveSpecs = ['**/*.live.spec.ts'];

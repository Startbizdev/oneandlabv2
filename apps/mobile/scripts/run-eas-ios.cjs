#!/usr/bin/env node
/**
 * Lance EAS iOS avec Git dans le PATH (Windows : Git souvent absent du PATH PowerShell).
 * Usage : node scripts/run-eas-ios.cjs [args eas-cli…]
 * Défaut : build --platform ios --profile production --auto-submit
 */
const { runEas } = require('./run-eas.cjs');

const passthrough = process.argv.slice(2);
const easArgs =
  passthrough.length > 0
    ? passthrough
    : ['build', '--platform', 'ios', '--profile', 'production', '--auto-submit'];

// Apple refuse tout build dont la version marketing est déjà approuvée (« train closed ») : on monte donc
// la version à chaque build production. SKIP_IOS_VERSION_BUMP est ignoré (il causait ces refus) ;
// KEEP_IOS_VERSION=1 garde la version, seulement si on sait qu'elle n'a jamais été approuvée.
function shouldBumpIosStoreVersion(args) {
  if (process.env.KEEP_IOS_VERSION === '1') return false;
  if (process.env.SKIP_IOS_VERSION_BUMP === '1') {
    console.warn('⚠️  SKIP_IOS_VERSION_BUMP est ignoré : la version est montée pour éviter un refus Apple (KEEP_IOS_VERSION=1 pour forcer).');
  }
  if (!args.includes('build')) return false;

  const profileIdx = args.indexOf('--profile');
  const profile = profileIdx >= 0 ? args[profileIdx + 1] : 'production';
  if (profile !== 'production') return false;

  const platformIdx = args.indexOf('--platform');
  if (platformIdx >= 0) {
    const platform = args[platformIdx + 1];
    if (platform && platform !== 'ios') return false;
  }

  return true;
}

if (shouldBumpIosStoreVersion(easArgs)) {
  require('./bump-ios-store-version.cjs');
}

process.exit(runEas(easArgs));

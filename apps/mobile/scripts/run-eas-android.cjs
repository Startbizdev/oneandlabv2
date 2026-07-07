#!/usr/bin/env node
/**
 * Lance EAS Android avec Git dans le PATH (Windows : Git souvent absent du PATH PowerShell).
 * Usage : node scripts/run-eas-android.cjs [args eas-cli…]
 * Défaut : build --platform android --profile production --auto-submit
 */
const { runEas } = require('./run-eas.cjs');

const passthrough = process.argv.slice(2);
const easArgs =
  passthrough.length > 0
    ? passthrough
    : ['build', '--platform', 'android', '--profile', 'production', '--auto-submit'];

process.exit(runEas(easArgs));

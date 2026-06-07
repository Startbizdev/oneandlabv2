#!/usr/bin/env node
/**
 * Vérifie le mode Hermes après le pod install EAS — échoue avant fastlane (~30s).
 */
const fs = require('fs');
const path = require('path');

const pbxPath = path.join(
  __dirname,
  '..',
  'ios',
  'Pods',
  'Pods.xcodeproj',
  'project.pbxproj'
);

if (!fs.existsSync(pbxPath)) {
  console.error('\n✗ Post-install: Pods.xcodeproj introuvable\n');
  process.exit(1);
}

const pbx = fs.readFileSync(pbxPath, 'utf8');

if (pbx.includes('[Hermes] Replace Hermes for the right configuration, if needed')) {
  console.error(
    '\n✗ Post-install: Hermes en mode précompilé — le build archive échouerait sur Copy XCFrameworks.\n' +
      '  Vérifier eas.json env + scripts/eas-prebuild-ios.cjs\n'
  );
  process.exit(1);
}

console.log('✓ Post-install: Hermes OK (pas de script Replace Hermes)');

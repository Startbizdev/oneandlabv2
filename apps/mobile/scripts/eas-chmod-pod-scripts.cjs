#!/usr/bin/env node
/**
 * EAS post-install : CocoaPods génère parfois des .sh sans bit exécutable
 * (hermes-engine-xcframeworks.sh → Permission denied sur Copy XCFrameworks).
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const iosDir = path.resolve(__dirname, '..', 'ios');
const targetSupport = path.join(iosDir, 'Pods', 'Target Support Files');

if (!fs.existsSync(targetSupport)) {
  console.log('→ eas-chmod-pod-scripts: Pods/Target Support Files absent, skip.');
  process.exit(0);
}

console.log('→ eas-chmod-pod-scripts: chmod +x sur les scripts CocoaPods…');
const result = spawnSync(
  'find',
  [targetSupport, '-name', '*.sh', '-exec', 'chmod', '+x', '{}', ';'],
  { stdio: 'inherit', shell: false }
);

if (result.status !== 0) {
  console.error('✗ eas-chmod-pod-scripts: chmod a échoué.');
  process.exit(result.status ?? 1);
}

console.log('✓ Scripts CocoaPods exécutables.');

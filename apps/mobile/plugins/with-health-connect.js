const { withAndroidManifest, withMainActivity } = require('expo/config-plugins');

const DELEGATE_IMPORT = 'import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate';
const DELEGATE_CALL = 'HealthConnectPermissionDelegate.setPermissionDelegate(this)';
const RATIONALE_ACTION = 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE';
const USAGE_ALIAS = 'ViewPermissionUsageActivity';

/**
 * react-native-health-connect : sans délégué enregistré dans MainActivity, `requestPermission`
 * plante (lateinit non initialisé). Android 14+ exige en plus l'alias VIEW_PERMISSION_USAGE.
 */
function withHealthConnectMainActivity(config) {
  return withMainActivity(config, (modConfig) => {
    let src = modConfig.modResults.contents;
    if (!src.includes(DELEGATE_IMPORT)) {
      src = src.replace(/^(package [^\n]+\n)/, `$1${DELEGATE_IMPORT}\n`);
    }
    if (!src.includes(DELEGATE_CALL)) {
      src = src.replace(/(super\.onCreate\([^)]*\)\n)/, `$1    ${DELEGATE_CALL}\n`);
    }
    if (!src.includes(DELEGATE_IMPORT) || !src.includes(DELEGATE_CALL)) {
      throw new Error('with-health-connect : MainActivity.kt inattendu, délégué non injecté.');
    }
    modConfig.modResults.contents = src;
    return modConfig;
  });
}

function withHealthConnectManifest(config) {
  return withAndroidManifest(config, (modConfig) => {
    const application = modConfig.modResults.manifest.application[0];
    const mainActivity = application.activity.find(
      (activity) => activity.$['android:name'] === '.MainActivity',
    );
    if (!mainActivity) {
      throw new Error('with-health-connect : .MainActivity absente du manifeste.');
    }

    mainActivity['intent-filter'] = mainActivity['intent-filter'] ?? [];
    const hasRationale = mainActivity['intent-filter'].some((filter) =>
      (filter.action ?? []).some((action) => action.$['android:name'] === RATIONALE_ACTION),
    );
    if (!hasRationale) {
      mainActivity['intent-filter'].push({ action: [{ $: { 'android:name': RATIONALE_ACTION } }] });
    }

    application['activity-alias'] = application['activity-alias'] ?? [];
    const hasAlias = application['activity-alias'].some(
      (alias) => alias.$['android:name'] === USAGE_ALIAS,
    );
    if (!hasAlias) {
      application['activity-alias'].push({
        $: {
          'android:name': USAGE_ALIAS,
          'android:exported': 'true',
          'android:targetActivity': '.MainActivity',
          'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE' } }],
            category: [{ $: { 'android:name': 'android.intent.category.HEALTH_PERMISSIONS' } }],
          },
        ],
      });
    }
    return modConfig;
  });
}

module.exports = function withHealthConnect(config) {
  return withHealthConnectManifest(withHealthConnectMainActivity(config));
};

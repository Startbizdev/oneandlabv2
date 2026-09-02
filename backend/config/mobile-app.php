<?php

/**
 * Politique de version de l'app mobile Cary (iOS / Android).
 * Modifier les variables MOBILE_* dans .env pour forcer une mise à jour store.
 */
$androidPackage = $_ENV['GOOGLE_IAP_PACKAGE_NAME'] ?? 'com.carybioapp.app';
$iosStoreId = trim((string) ($_ENV['MOBILE_IOS_APP_STORE_ID'] ?? '6778805884'));
$iosStoreUrl = trim((string) ($_ENV['MOBILE_IOS_STORE_URL'] ?? ''));
if ($iosStoreUrl === '' && $iosStoreId !== '') {
    $iosStoreUrl = 'https://apps.apple.com/app/id' . $iosStoreId;
}

return [
    'ios' => [
        'min_version' => trim((string) ($_ENV['MOBILE_IOS_MIN_VERSION'] ?? '1.0.0')),
        'latest_version' => trim((string) ($_ENV['MOBILE_IOS_LATEST_VERSION'] ?? '1.7.9')),
        'store_url' => $iosStoreUrl,
    ],
    'android' => [
        'min_version' => trim((string) ($_ENV['MOBILE_ANDROID_MIN_VERSION'] ?? '1.0.0')),
        'latest_version' => trim((string) ($_ENV['MOBILE_ANDROID_LATEST_VERSION'] ?? '1.7.9')),
        'min_version_code' => max(1, (int) ($_ENV['MOBILE_ANDROID_MIN_VERSION_CODE'] ?? 7)),
        'store_url' => trim((string) ($_ENV['MOBILE_ANDROID_STORE_URL'] ?? ''))
            ?: ('https://play.google.com/store/apps/details?id=' . $androidPackage),
    ],
    'messages' => [
        'force' => trim((string) ($_ENV['MOBILE_UPDATE_FORCE_MESSAGE'] ?? ''))
            ?: 'Une nouvelle version de Cary est disponible. Mettez à jour pour continuer à utiliser l’application.',
        'optional' => trim((string) ($_ENV['MOBILE_UPDATE_OPTIONAL_MESSAGE'] ?? ''))
            ?: 'Une mise à jour de Cary est disponible avec des améliorations.',
    ],
];

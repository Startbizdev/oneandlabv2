<?php

/**
 * Vérifie et active les profils publics (infirmiers et laboratoires / sous-comptes)
 * pour qu'ils apparaissent sur /laboratoires et /infirmiers.
 *
 * Usage : php check-public-profiles.php
 *         php check-public-profiles.php --fix       (met à jour les profils sans slug / non activés)
 *         php check-public-profiles.php --fix-slug  (régénère public_slug à partir du nom affiché)
 */

$envFile = __DIR__ . '/.env';
if (file_exists($envFile) && is_readable($envFile)) {
    $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) continue;
            if (strpos($line, '=') === false) continue;
            list($name, $value) = explode('=', $line, 2);
            $_ENV[trim($name)] = trim($value);
        }
    }
}

$doFix = in_array('--fix', $argv ?? [], true);
$doFixSlug = in_array('--fix-slug', $argv ?? [], true);

try {
    $config = require __DIR__ . '/config/database.php';
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['host'],
        $config['port'],
        $config['database'],
        $config['charset']
    );
    $pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);

    if ($doFixSlug) {
        require_once __DIR__ . '/lib/Crypto.php';
        $crypto = new Crypto();
        $stmt = $pdo->query("SHOW COLUMNS FROM profiles LIKE 'company_name_encrypted'");
        $hasCompanyName = $stmt && $stmt->rowCount() > 0;
        foreach (['nurse' => null, 'subaccount' => $hasCompanyName, 'lab' => $hasCompanyName] as $role => $useCompanyName) {
            $select = "id, public_slug, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek";
            if ($useCompanyName) {
                $select .= ", company_name_encrypted, company_name_dek";
            }
            $stmt = $pdo->prepare("SELECT {$select} FROM profiles WHERE role = ?");
            $stmt->execute([$role]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $usedSlugs = [];
            foreach ($rows as $r) {
                $name = '';
                if ($useCompanyName && !empty($r['company_name_encrypted'] ?? '') && !empty($r['company_name_dek'] ?? '')) {
                    $name = trim((string) $crypto->decryptField($r['company_name_encrypted'], $r['company_name_dek']));
                }
                if ($name === '') {
                    $name = trim(
                        $crypto->decryptField($r['first_name_encrypted'] ?? '', $r['first_name_dek'] ?? '')
                        . ' ' .
                        $crypto->decryptField($r['last_name_encrypted'] ?? '', $r['last_name_dek'] ?? '')
                    );
                }
                $transliterate = function ($s) {
                    $s = trim($s);
                    $accents = ['à'=>'a','á'=>'a','â'=>'a','ä'=>'a','è'=>'e','é'=>'e','ê'=>'e','ë'=>'e','ì'=>'i','í'=>'i','î'=>'i','ï'=>'i','ò'=>'o','ó'=>'o','ô'=>'o','ö'=>'o','ù'=>'u','ú'=>'u','û'=>'u','ü'=>'u','ç'=>'c','œ'=>'oe','æ'=>'ae'];
                    $s = strtr(mb_strtolower($s, 'UTF-8'), $accents);
                    return preg_replace('/[^a-z0-9]+/', '-', $s);
                };
                $base = preg_replace('/^-+|-+$/', '', $transliterate($name));
                if ($base === '') {
                    $base = 'profil-' . $r['id'];
                }
                $slug = $base;
                $n = 2;
                while (isset($usedSlugs[$slug]) && $usedSlugs[$slug] !== (string) $r['id']) {
                    $slug = $base . '-' . $n;
                    $n++;
                }
                $usedSlugs[$slug] = $r['id'];
                $up = $pdo->prepare("UPDATE profiles SET public_slug = ? WHERE id = ?");
                $up->execute([$slug, $r['id']]);
                if ($up->rowCount() > 0) {
                    echo ($role === 'nurse' ? 'Infirmier' : 'Laboratoire') . " id={$r['id']} → slug={$slug}\n";
                }
            }
        }
        echo "\nSlugs régénérés. Exécutez sans --fix-slug pour voir l’état.\n";
        exit(0);
    }

    echo "=== Profils publics (infirmiers, comptes lab, sous-comptes) ===\n\n";

    foreach (['nurse' => 'Infirmiers', 'lab' => 'Laboratoires (comptes lab)', 'subaccount' => 'Laboratoires (sous-comptes)'] as $role => $label) {
        $stmt = $pdo->prepare("SELECT id, role, public_slug, is_public_profile_enabled FROM profiles WHERE role = ?");
        $stmt->execute([$role]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $total = count($rows);
        $withSlug = 0;
        $enabled = 0;
        $ready = 0;
        foreach ($rows as $r) {
            if (!empty(trim((string)($r['public_slug'] ?? '')))) $withSlug++;
            if (!empty($r['is_public_profile_enabled'])) $enabled++;
            if (trim((string)($r['public_slug'] ?? '')) !== '' && !empty($r['is_public_profile_enabled'])) $ready++;
        }

        echo "$label (role=$role)\n";
        echo "  Total : $total | Avec public_slug : $withSlug | is_public_profile_enabled=1 : $enabled | Affichés sur le site : $ready\n";

        if ($total > 0) {
            foreach ($rows as $r) {
                $slug = $r['public_slug'] ?? '';
                $on = (int)($r['is_public_profile_enabled'] ?? 0);
                $ok = $on && trim($slug) !== '' ? '✓' : '✗';
                echo "  id={$r['id']} slug=" . (trim($slug) ?: '(vide)') . " enabled=$on $ok\n";
            }
        }
        echo "\n";

        if ($doFix && $total > 0) {
            $stmt = $pdo->prepare("
                UPDATE profiles
                SET is_public_profile_enabled = 1,
                    public_slug = CASE
                        WHEN public_slug IS NULL OR TRIM(public_slug) = '' THEN CONCAT('profil-', id)
                        ELSE public_slug
                    END
                WHERE role = ?
                AND (is_public_profile_enabled = 0 OR public_slug IS NULL OR TRIM(public_slug) = '')
            ");
            $stmt->execute([$role]);
            $updated = $stmt->rowCount();
            echo "  → Mis à jour : $updated profil(s) (slug + enabled=1).\n\n";
        }
    }

    if (!$doFix && !$doFixSlug) {
        echo "Pour activer l'affichage des profils manquants : php check-public-profiles.php --fix\n";
        echo "Pour régénérer les slugs à partir du nom affiché : php check-public-profiles.php --fix-slug\n";
    }
} catch (Exception $e) {
    echo "Erreur : " . $e->getMessage() . "\n";
    exit(1);
}

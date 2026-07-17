<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../lib/Logger.php';
require_once __DIR__ . '/../../lib/Uuid.php';

// CORS
$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true'); // Autoriser l'envoi de cookies pour les sessions

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$config = require __DIR__ . '/../../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
$logger = new Logger();

/**
 * Ajoute le champ options (sous-choix) à chaque catégorie.
 * @param PDO $db
 * @param array $categories
 * @return array
 */
function appendCategoryOptions(PDO $db, array $categories): array {
    if (empty($categories)) {
        return $categories;
    }
    try {
        $ids = array_column($categories, 'id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $optStmt = $db->prepare("
            SELECT care_category_id, option_key, label, field_type, options, is_required, sort_order
            FROM care_category_options
            WHERE care_category_id IN ($placeholders)
            ORDER BY care_category_id, sort_order, id
        ");
        $optStmt->execute($ids);
        $optionsByCat = [];
        while ($row = $optStmt->fetch(PDO::FETCH_ASSOC)) {
            $cid = $row['care_category_id'];
            unset($row['care_category_id']);
            $row['options'] = isset($row['options']) && $row['options'] !== null
                ? (is_string($row['options']) ? json_decode($row['options'], true) : $row['options'])
                : null;
            $row['is_required'] = (bool) ($row['is_required'] ?? false);
            if (!isset($optionsByCat[$cid])) {
                $optionsByCat[$cid] = [];
            }
            $optionsByCat[$cid][] = $row;
        }
        foreach ($categories as &$cat) {
            $cat['options'] = $optionsByCat[$cat['id']] ?? [];
        }
        unset($cat);
        return $categories;
    } catch (Throwable $e) {
        // BDD sans migration `care_category_options` (ou erreur ponctuelle) : ne pas faire échouer toute la liste.
        error_log('appendCategoryOptions: ' . $e->getMessage());
        foreach ($categories as &$cat) {
            $cat['options'] = [];
        }
        unset($cat);
        return $categories;
    }
}

/**
 * Nombre de RDV par catégorie (pour « Les plus demandés » sur le parcours patient).
 */
function appendAppointmentCounts(PDO $db, array $categories): array
{
    if (empty($categories)) {
        return $categories;
    }
    $ids = array_column($categories, 'id');
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $cntStmt = $db->prepare("
        SELECT category_id, COUNT(*) AS appointment_count
        FROM appointments
        WHERE category_id IN ($placeholders)
        GROUP BY category_id
    ");
    $cntStmt->execute($ids);
    $counts = [];
    while ($row = $cntStmt->fetch(PDO::FETCH_ASSOC)) {
        $counts[$row['category_id']] = (int) $row['appointment_count'];
    }
    foreach ($categories as &$cat) {
        $cat['appointment_count'] = $counts[$cat['id']] ?? 0;
    }
    unset($cat);

    return $categories;
}

/** Fragment SQL , cc.icon , cc.image_url selon colonnes présentes */
function care_categories_column_fragment(PDO $db, string $tableAlias = ''): string {
    $frag = '';
    $pre = $tableAlias !== '' ? $tableAlias . '.' : '';
    $st = $db->query("SHOW COLUMNS FROM care_categories LIKE 'icon'");
    if ($st && $st->rowCount() > 0) {
        $frag .= ', ' . $pre . 'icon';
    }
    $st = $db->query("SHOW COLUMNS FROM care_categories LIKE 'image_url'");
    if ($st && $st->rowCount() > 0) {
        $frag .= ', ' . $pre . 'image_url';
    }
    $st = $db->query("SHOW COLUMNS FROM care_categories LIKE 'catalog_group'");
    if ($st && $st->rowCount() > 0) {
        $frag .= ', ' . $pre . 'catalog_group';
    }
    $st = $db->query("SHOW COLUMNS FROM care_categories LIKE 'skip_prescription_documents'");
    if ($st && $st->rowCount() > 0) {
        $frag .= ', ' . $pre . 'skip_prescription_documents';
    }
    return $frag;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Options d'une seule catégorie (lazy load mobile)
    if (!empty($_GET['category_options_for'])) {
        try {
            $catId = trim((string) $_GET['category_options_for']);
            $stmt = $db->prepare('SELECT id FROM care_categories WHERE id = ? AND is_active = TRUE LIMIT 1');
            $stmt->execute([$catId]);
            if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Catégorie introuvable', 'code' => 'NOT_FOUND']);
                exit;
            }
            $stub = [['id' => $catId]];
            $withOpts = appendCategoryOptions($db, $stub);
            echo json_encode([
                'success' => true,
                'data' => $withOpts[0]['options'] ?? [],
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage(), 'code' => 'SERVER_ERROR']);
        }
        exit;
    }

    // Liste des catégories (public pour patients, authentifié pour admins)
    try {
        $type = $_GET['type'] ?? null;
        $scope = $_GET['scope'] ?? 'full';
        $isPickerScope = $scope === 'picker';
        $providerId = $_GET['provider_id'] ?? null;
        $includeInactive = isset($_GET['include_inactive']) && $_GET['include_inactive'] === 'true';

        // Vérifier si l'utilisateur est authentifié (pour voir les catégories inactives)
        $user = null;
        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authMiddleware = new AuthMiddleware();
            $user = $authMiddleware->handle();
        }

        // Si provider_id est fourni, retourner uniquement les catégories activées par ce provider
        if ($providerId) {
            // Déterminer le rôle du provider
            $roleStmt = $db->prepare('SELECT role FROM profiles WHERE id = ?');
            $roleStmt->execute([$providerId]);
            $providerRow = $roleStmt->fetch(PDO::FETCH_ASSOC);

            $providerRole = (string) ($providerRow['role'] ?? '');

            if ($providerRole === 'nurse') {
                // Infirmier : catégories nursing activées via nurse_category_preferences
                $ccf = care_categories_column_fragment($db, 'cc');
                $sql = "
                    SELECT cc.id, cc.name, cc.description, cc.type{$ccf}, cc.is_active, cc.created_at
                    FROM care_categories cc
                    LEFT JOIN nurse_category_preferences ncp
                        ON cc.id = ncp.category_id AND ncp.nurse_id = ?
                    WHERE cc.is_active = TRUE
                    AND cc.type = 'nursing'
                    AND (ncp.id IS NULL OR ncp.is_enabled = TRUE)
                    ORDER BY cc.name ASC
                ";
                $stmt = $db->prepare($sql);
                $stmt->execute([$providerId]);
                $categories = $stmt->fetchAll();
            } elseif ($providerRole === 'pro') {
                // Pro de santé (QR) : prélèvements + soins infirmiers
                $ccf = care_categories_column_fragment($db, '');
                $sql = 'SELECT id, name, description, type' . $ccf . ', is_active, created_at
                    FROM care_categories
                    WHERE is_active = TRUE AND type IN (?, ?)
                    ORDER BY FIELD(type, \'nursing\', \'blood_test\'), name ASC';
                $stmt = $db->prepare($sql);
                $stmt->execute(['nursing', 'blood_test']);
                $categories = $stmt->fetchAll();
            } else {
                // Lab/subaccount : toutes les catégories blood_test actives
                $ccf = care_categories_column_fragment($db, '');
                $sql = 'SELECT id, name, description, type' . $ccf . ', is_active, created_at FROM care_categories WHERE is_active = TRUE AND type = ? ORDER BY name ASC';
                $stmt = $db->prepare($sql);
                $stmt->execute(['blood_test']);
                $categories = $stmt->fetchAll();
            }

            if (!$isPickerScope) {
                $categories = appendCategoryOptions($db, $categories);
            } else {
                foreach ($categories as &$c) {
                    $c['options'] = [];
                }
                unset($c);
            }
        } else {
            $ccf = care_categories_column_fragment($db, '');
            $sql = 'SELECT id, name, description, type' . $ccf . ', is_active, created_at FROM care_categories WHERE 1=1';
            $params = [];

            if (!$includeInactive || !$user) {
                $sql .= ' AND is_active = TRUE';
            }

            if ($type) {
                $sql .= ' AND type = ?';
                $params[] = $type;
            }

            $sql .= ' ORDER BY name ASC';

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $categories = $stmt->fetchAll();
        }

        if (!$isPickerScope) {
            $categories = appendCategoryOptions($db, $categories);
            $categories = appendAppointmentCounts($db, $categories);
        } else {
            foreach ($categories as &$cat) {
                $cat['options'] = [];
                $cat['appointment_count'] = 0;
            }
            unset($cat);
            header('Cache-Control: public, max-age=3600');
        }

        echo json_encode([
            'success' => true,
            'data' => $categories,
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'code' => 'SERVER_ERROR',
        ]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Authentification requise pour créer
    $authMiddleware = new AuthMiddleware();
    $user = $authMiddleware->handle();

    // Vérifier rôle admin
    if ($user['role'] !== 'super_admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Accès refusé']);
        exit;
    }

    CSRFMiddleware::handle();

    try {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || !isset($data['name']) || !isset($data['type'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Données invalides']);
            exit;
        }

        $id = Uuid::v4();
        $isActive = 1;
        if (array_key_exists('is_active', $data)) {
            $v = $data['is_active'];
            $isActive = ($v === true || $v === 1 || $v === '1') ? 1 : 0;
        }

        $hasIcon = $db->query("SHOW COLUMNS FROM care_categories LIKE 'icon'")->rowCount() > 0;
        $hasImg = $db->query("SHOW COLUMNS FROM care_categories LIKE 'image_url'")->rowCount() > 0;
        $hasSkipRx = $db->query("SHOW COLUMNS FROM care_categories LIKE 'skip_prescription_documents'")->rowCount() > 0;
        $skipRx = 0;
        if ($hasSkipRx && array_key_exists('skip_prescription_documents', $data)) {
            $sv = $data['skip_prescription_documents'];
            $skipRx = ($sv === true || $sv === 1 || $sv === '1') ? 1 : 0;
        }

        $cols = ['id', 'name', 'description', 'type'];
        $vals = [$id, $data['name'], $data['description'] ?? '', $data['type']];
        if ($hasIcon) {
            $cols[] = 'icon';
            $vals[] = $data['icon'] ?? null;
        }
        if ($hasImg) {
            $cols[] = 'image_url';
            $vals[] = $data['image_url'] ?? null;
        }
        $cols[] = 'is_active';
        $vals[] = $isActive;
        if ($hasSkipRx) {
            $cols[] = 'skip_prescription_documents';
            $vals[] = $skipRx;
        }

        $placeholders = implode(',', array_fill(0, count($cols), '?'));
        $stmt = $db->prepare('INSERT INTO care_categories (' . implode(',', $cols) . ') VALUES (' . $placeholders . ')');
        $stmt->execute($vals);

        // Insérer les options (sous-choix) si fournies
        if (!empty($data['options']) && is_array($data['options'])) {
            $optInsert = $db->prepare('
                INSERT INTO care_category_options (id, care_category_id, option_key, label, field_type, options, is_required, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $sortOrder = 0;
            foreach ($data['options'] as $opt) {
                if (empty($opt['option_key']) || empty($opt['label']) || empty($opt['field_type'])) {
                    continue;
                }
                $optId = Uuid::v4();
                $optOptions = isset($opt['options']) && is_array($opt['options'])
                    ? json_encode($opt['options'])
                    : (isset($opt['options']) && is_string($opt['options']) ? $opt['options'] : null);
                $optInsert->execute([
                    $optId,
                    $id,
                    $opt['option_key'],
                    $opt['label'],
                    $opt['field_type'],
                    $optOptions,
                    !empty($opt['is_required']) ? 1 : 0,
                    $opt['sort_order'] ?? $sortOrder++
                ]);
            }
        }

        $logger->log($user['user_id'], $user['role'], 'create', 'care_category', $id, $data);

        $created = [
            'id' => $id,
            'name' => $data['name'],
            'description' => $data['description'] ?? '',
            'type' => $data['type'],
            'icon' => $data['icon'] ?? null,
            'image_url' => $hasImg ? ($data['image_url'] ?? null) : null,
            'is_active' => (bool) $isActive,
        ];
        if ($hasSkipRx) {
            $created['skip_prescription_documents'] = (bool) $skipRx;
        }
        $created['options'] = appendCategoryOptions($db, [$created])[0]['options'] ?? [];

        echo json_encode([
            'success' => true,
            'data' => $created,
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'code' => 'SERVER_ERROR',
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}


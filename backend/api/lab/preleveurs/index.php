<?php

/**
 * API Lab - Préleveurs
 * GET: Liste des préleveurs du laboratoire
 * POST: Créer un préleveur
 * Conformité HDS: données chiffrées, logs d'audit
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../models/User.php';
require_once __DIR__ . '/../../../config/cors.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (strpos($origin, 'http://localhost:') === 0 || in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

if (!in_array($user['role'], ['lab', 'subaccount'], true)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès réservé au laboratoire ou au sous-compte']);
    exit;
}

$userModel = new User();
// Lab = son id ; sous-compte = lab_id de son profil
$labId = $user['role'] === 'lab' ? $user['user_id'] : $userModel->getLabId($user['user_id']);
if (!$labId) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Sous-compte non rattaché à un laboratoire']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(100, max(1, (int)($_GET['limit'] ?? 50)));
    
    $config = require __DIR__ . '/../../../config/database.php';
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
    $db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

    // Lab : inclure les préleveurs du lab principal ET des sous-comptes (pour assignation RDV)
    $allowedLabIds = [$labId];
    if ($user['role'] === 'lab') {
        $stmtSub = $db->prepare("SELECT id FROM profiles WHERE lab_id = ? AND role = 'subaccount'");
        $stmtSub->execute([$labId]);
        while ($sub = $stmtSub->fetch(PDO::FETCH_ASSOC)) {
            if (!empty($sub['id'])) {
                $allowedLabIds[] = $sub['id'];
            }
        }
    }

    if (count($allowedLabIds) === 1) {
        $result = $userModel->getAll(
            ['role' => 'preleveur', 'lab_id' => $labId],
            $page,
            $limit,
            $labId,
            'lab'
        );
        foreach ($result['data'] as &$preleveur) {
            $preleveur['lab_id'] = $labId;
        }
        unset($preleveur);
    } else {
        $placeholders = implode(',', array_fill(0, count($allowedLabIds), '?'));
        $countSql = "SELECT COUNT(*) as total FROM profiles WHERE role = 'preleveur' AND lab_id IN ($placeholders)";
        $stmtCount = $db->prepare($countSql);
        $stmtCount->execute($allowedLabIds);
        $total = (int) $stmtCount->fetch(PDO::FETCH_COLUMN);
        $offset = ($page - 1) * $limit;
        $pages = $limit > 0 ? (int) ceil($total / $limit) : 0;
        $sql = "SELECT id, lab_id FROM profiles WHERE role = 'preleveur' AND lab_id IN ($placeholders) ORDER BY created_at DESC LIMIT " . (int) $limit . " OFFSET " . (int) $offset;
        $stmtIds = $db->prepare($sql);
        $stmtIds->execute($allowedLabIds);
        $rows = $stmtIds->fetchAll(PDO::FETCH_ASSOC);
        $result = [
            'data' => [],
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'pages' => $pages,
        ];
        foreach ($rows as $row) {
            $decrypted = $userModel->getById($row['id'], $labId, 'lab');
            if ($decrypted) {
                $decrypted['lab_id'] = $row['lab_id'] ?? null;
                $result['data'][] = $decrypted;
            }
        }
    }
    
    // Enrichir avec les stats des rendez-vous (assigned_to = préleveur)
    foreach ($result['data'] as &$preleveur) {
        $stmt = $db->prepare('SELECT COUNT(*) as total, SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed FROM appointments WHERE assigned_to = ?');
        $stmt->execute([$preleveur['id']]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $preleveur['stats'] = [
            'totalAppointments' => (int)($row['total'] ?? 0),
            'completedAppointments' => (int)($row['completed'] ?? 0),
        ];
    }
    
    echo json_encode([
        'success' => true,
        'data' => $result['data'],
        'pagination' => [
            'page' => $result['page'],
            'limit' => $result['limit'],
            'total' => $result['total'],
            'pages' => $result['pages'],
        ],
    ]);
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    CSRFMiddleware::handle();
    
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    $email = trim($input['email'] ?? '');
    $firstName = trim($input['first_name'] ?? '');
    $lastName = trim($input['last_name'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $targetLabId = !empty(trim((string)($input['lab_id'] ?? ''))) ? trim((string)$input['lab_id']) : null;
    
    if (empty($email) || empty($firstName) || empty($lastName)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Email, prénom et nom sont requis']);
        exit;
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Email invalide']);
        exit;
    }
    
    $config = require __DIR__ . '/../../../config/database.php';
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
    $db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

    // Lab peut assigner le préleveur au lab principal ou à un de ses sous-comptes
    $effectiveLabId = $labId;
    if ($targetLabId && $user['role'] === 'lab') {
        $allowedIds = [$labId];
        $stmtSub = $db->prepare("SELECT id FROM profiles WHERE lab_id = ? AND role = 'subaccount'");
        $stmtSub->execute([$labId]);
        while ($sub = $stmtSub->fetch(PDO::FETCH_ASSOC)) {
            if (!empty($sub['id'])) $allowedIds[] = $sub['id'];
        }
        if (in_array($targetLabId, $allowedIds, true)) {
            $effectiveLabId = $targetLabId;
        }
    }
    
    // Vérifier la limite préleveurs selon le plan (toute l'équipe : lab + sous-comptes)
    $stmt = $db->prepare('SELECT plan_slug FROM subscriptions WHERE user_id = ? AND status IN (\'active\', \'trialing\') ORDER BY updated_at DESC LIMIT 1');
    $stmt->execute([$labId]);
    $sub = $stmt->fetch(PDO::FETCH_ASSOC);
    $planSlug = $sub ? ($sub['plan_slug'] ?? 'free') : 'free';
    $limits = require __DIR__ . '/../../../config/plan-limits.php';
    $labLimits = $limits['lab'][$planSlug] ?? $limits['lab']['free'];
    $maxPreleveurs = $labLimits['max_preleveurs'] ?? 0;
    if ($maxPreleveurs !== null) {
        $teamLabIds = [$labId];
        $stmtSub = $db->prepare("SELECT id FROM profiles WHERE lab_id = ? AND role = 'subaccount'");
        $stmtSub->execute([$labId]);
        while ($row = $stmtSub->fetch(PDO::FETCH_ASSOC)) {
            if (!empty($row['id'])) $teamLabIds[] = $row['id'];
        }
        $placeholders = implode(',', array_fill(0, count($teamLabIds), '?'));
        $stmt = $db->prepare("SELECT COUNT(*) FROM profiles WHERE lab_id IN ($placeholders) AND role = 'preleveur'");
        $stmt->execute($teamLabIds);
        $count = (int) $stmt->fetchColumn();
        if ($count >= $maxPreleveurs) {
            http_response_code(403);
            $msg = $planSlug === 'free'
                ? 'Souscrivez à un abonnement Starter ou Pro pour ajouter des préleveurs.'
                : 'Limite de préleveurs atteinte pour votre offre. Passez à l\'offre Pro pour des préleveurs illimités.';
            echo json_encode(['success' => false, 'error' => $msg]);
            exit;
        }
    }
    
    try {
        $id = $userModel->create([
            'email' => $email,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'phone' => $phone ?: null,
            'role' => 'preleveur',
            'lab_id' => $effectiveLabId,
        ], $labId, 'lab');
        
        echo json_encode(['success' => true, 'data' => ['id' => $id]]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}

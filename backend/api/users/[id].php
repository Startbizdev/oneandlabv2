<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../../config/cors.php';

// CORS
$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Authentification
$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

$userModel = new User();

// Extraire l'ID depuis l'URL
$id = $_GET['id'] ?? null;

if (!$id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID requis']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Détails d'un utilisateur
    try {
        $userData = $userModel->getById($id, $user['user_id'], $user['role']);

        if (!$userData) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Utilisateur introuvable',
                'code' => 'NOT_FOUND',
            ]);
            exit;
        }

        $allowed = ($id === $user['user_id'] || $user['role'] === 'super_admin');
        if (!$allowed && $user['role'] === 'lab') {
            // Lab peut consulter le profil de ses préleveurs et sous-comptes (lab principal ou sous-comptes)
            $targetLabId = $userData['lab_id'] ?? '';
            if (in_array($userData['role'] ?? '', ['preleveur', 'subaccount'], true)) {
                if ($targetLabId === $user['user_id']) {
                    $allowed = true;
                } else {
                    $config = require __DIR__ . '/../../config/database.php';
                    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
                    $pdo = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
                    $stmtSub = $pdo->prepare("SELECT id FROM profiles WHERE lab_id = ? AND role = 'subaccount'");
                    $stmtSub->execute([$user['user_id']]);
                    while ($row = $stmtSub->fetch(PDO::FETCH_ASSOC)) {
                        if (!empty($row['id']) && $row['id'] === $targetLabId) {
                            $allowed = true;
                            break;
                        }
                    }
                }
            }
        }
        if (!$allowed && $user['role'] === 'pro') {
            // Pro peut consulter le profil de ses patients (created_by = pro)
            $allowed = (($userData['role'] ?? '') === 'patient')
                && !empty($userData['created_by']) && $userData['created_by'] === $user['user_id'];
        }
        if (!$allowed) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'Vous ne pouvez consulter que votre propre profil ou celui des membres de votre laboratoire',
                'code' => 'FORBIDDEN',
            ]);
            exit;
        }

        // Logger la consultation de données sensibles (HDS)
        require_once __DIR__ . '/../../lib/Logger.php';
        $logger = new Logger();
        $logger->log(
            $user['user_id'],
            $user['role'],
            'view',
            'profile',
            $id,
            [
                'viewed_role' => $userData['role'] ?? null,
                'has_sensitive_data' => !empty($userData['email']) || !empty($userData['phone']) || !empty($userData['address'])
            ]
        );

        echo json_encode([
            'success' => true,
            'data' => $userData,
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'code' => 'SERVER_ERROR',
        ]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    CSRFMiddleware::handle();
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Vérifier les permissions: propre profil, super_admin, lab modifiant son subaccount/preleveur, ou pro modifiant son patient
    $canEdit = ($id === $user['user_id']) || $user['role'] === 'super_admin';
    if (!$canEdit && $user['role'] === 'lab') {
        $targetLabId = $userModel->getLabId($id);
        $targetData = $userModel->getById($id, $user['user_id'], $user['role']);
        $targetRole = $targetData['role'] ?? '';
        if (in_array($targetRole, ['preleveur', 'subaccount'], true)) {
            if ($targetLabId === $user['user_id']) {
                $canEdit = true;
            } else {
                $config = require __DIR__ . '/../../config/database.php';
                $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
                $pdo = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
                $stmtSub = $pdo->prepare("SELECT id FROM profiles WHERE lab_id = ? AND role = 'subaccount'");
                $stmtSub->execute([$user['user_id']]);
                while ($row = $stmtSub->fetch(PDO::FETCH_ASSOC)) {
                    if (!empty($row['id']) && $row['id'] === $targetLabId) {
                        $canEdit = true;
                        break;
                    }
                }
            }
        }
    }
    if (!$canEdit && $user['role'] === 'pro') {
        $targetData = $userModel->getById($id, $user['user_id'], $user['role']);
        $canEdit = $targetData && (($targetData['role'] ?? '') === 'patient')
            && !empty($targetData['created_by']) && $targetData['created_by'] === $user['user_id'];
    }
    if (!$canEdit) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Vous ne pouvez modifier que votre propre profil ou les membres de votre laboratoire',
            'code' => 'FORBIDDEN',
        ]);
        exit;
    }

    // Lab modifiant un préleveur/sous-compte : lab_id ne peut être que le lab principal ou un de ses sous-comptes
    if ($user['role'] === 'lab' && isset($input['lab_id'])) {
        $newLabId = !empty(trim((string)$input['lab_id'])) ? trim((string)$input['lab_id']) : null;
        $allowedLabIds = [$user['user_id']];
        $config = require __DIR__ . '/../../config/database.php';
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
        $pdo = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
        $stmtSub = $pdo->prepare("SELECT id FROM profiles WHERE lab_id = ? AND role = 'subaccount'");
        $stmtSub->execute([$user['user_id']]);
        while ($row = $stmtSub->fetch(PDO::FETCH_ASSOC)) {
            if (!empty($row['id'])) $allowedLabIds[] = $row['id'];
        }
        if ($newLabId !== null && !in_array($newLabId, $allowedLabIds, true)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Le laboratoire assigné doit être le vôtre ou un de vos sous-comptes.',
                'code' => 'INVALID_LAB_ID',
            ]);
            exit;
        }
    }
    
    try {
        $success = $userModel->update($id, $input, $user['user_id'], $user['role']);
        
        if ($success) {
            echo json_encode([
                'success' => true,
            ]);
        } else {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Aucune donnée à mettre à jour',
                'code' => 'NO_UPDATE',
            ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'code' => 'SERVER_ERROR',
        ]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    // Supprimer: super_admin ou lab (ses subaccounts/preleveurs uniquement)
    
    // CSRF check
    $csrfMiddleware = new CSRFMiddleware();
    $csrfMiddleware->handle();
    
    if ($id === $user['user_id']) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Vous ne pouvez pas supprimer votre propre compte',
        ]);
        exit;
    }
    
    try {
        $success = $userModel->delete($id, $user['user_id'], $user['role']);
        
        if ($success) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Utilisateur non trouvé',
            ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}


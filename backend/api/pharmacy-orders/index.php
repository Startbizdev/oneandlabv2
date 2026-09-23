<?php

declare(strict_types=1);

require_once __DIR__ . '/../pharmacy/_helpers.php';
require_once __DIR__ . '/../../lib/NotificationService.php';
require_once __DIR__ . '/../../lib/pharmacy/PharmacyNotificationHelper.php';

[$user, $db, $moduleConfig, $orderService] = pharmacyApiBootstrap(['GET', 'POST', 'OPTIONS']);
$notifications = new NotificationService();
$pharmacyNotify = new PharmacyNotificationHelper($db);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $scope = isset($_GET['scope']) ? trim((string) $_GET['scope']) : 'sent';
    if (($user['role'] ?? '') === 'super_admin' && $scope === 'all') {
        $orders = $orderService->listForUser($user, 'all');
    } elseif ($scope === 'patient') {
        if (($user['role'] ?? '') !== 'patient') {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Accès refusé']);
            exit;
        }
        $orders = $orderService->listForUser($user, 'patient');
    } elseif ($scope === 'received') {
        $config = $moduleConfig->getConfig();
        if (!PharmacyModuleConfig::canReceive($user, $config) && ($user['role'] ?? '') !== 'super_admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Accès refusé']);
            exit;
        }
        $orders = $orderService->listForUser($user, 'received');
    } else {
        $orders = $orderService->listForUser($user, 'sent');
    }
    echo json_encode(['success' => true, 'data' => $orders]);
    exit;
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input') ?: '{}', true);
    if (!is_array($body)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'JSON invalide']);
        exit;
    }
    try {
        $order = $orderService->create($user, $body);
        $notifications->createNotification(
            (string) $order['pharmacy_id'],
            'pharmacy_order_created',
            'Nouvelle commande pharmacie',
            'Une ordonnance vous a été transmise.',
            ['pharmacy_order_id' => $order['id']],
        );
        $pharmacyNotify->maybeSendOrderEmail(
            (string) $order['pharmacy_id'],
            'Nouvelle commande pharmacie',
            'Une ordonnance vous a été transmise sur Cary.',
            '/pro/commandes-recues/' . $order['id'],
        );
        echo json_encode(['success' => true, 'data' => $order]);
    } catch (InvalidArgumentException $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    } catch (RuntimeException $e) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);

<?php

declare(strict_types=1);

require_once __DIR__ . '/../pharmacy/_helpers.php';
require_once __DIR__ . '/../../lib/NotificationService.php';
require_once __DIR__ . '/../../lib/pharmacy/PharmacyNotificationHelper.php';
require_once __DIR__ . '/../../lib/ApiServerError.php';

[$user, $db, $moduleConfig, $orderService] = pharmacyApiBootstrap(['GET', 'POST', 'OPTIONS']);
$notifications = new NotificationService();
$pharmacyNotify = new PharmacyNotificationHelper($db);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $scope = isset($_GET['scope']) ? trim((string) $_GET['scope']) : 'sent';
    $segment = isset($_GET['segment']) ? trim((string) $_GET['segment']) : null;
    if ($segment === '') {
        $segment = null;
    }
    $search = isset($_GET['q']) ? trim((string) $_GET['q']) : null;
    if (($user['role'] ?? '') === 'super_admin' && $scope === 'all') {
        $orders = $orderService->listForUser($user, 'all', $segment, $search);
        $listScope = 'all';
    } elseif ($scope === 'patient') {
        if (($user['role'] ?? '') !== 'patient') {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Accès refusé']);
            exit;
        }
        $orders = $orderService->listForUser($user, 'patient', $segment, $search);
        $listScope = 'patient';
    } elseif ($scope === 'received') {
        $config = $moduleConfig->getConfig();
        if (!PharmacyModuleConfig::canReceive($user, $config) && ($user['role'] ?? '') !== 'super_admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Accès refusé']);
            exit;
        }
        $orders = $orderService->listForUser($user, 'received', $segment, $search);
        $listScope = 'received';
    } else {
        $orders = $orderService->listForUser($user, 'sent', $segment, $search);
        $listScope = 'sent';
    }
    echo json_encode([
        'success' => true,
        'data' => $orders,
        'counts' => $orderService->segmentCounts($user, $listScope),
    ]);
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
        ['order' => $order, 'notify' => $notify] = $orderService->create($user, $body);
        if ($notify) {
            $notifications->createNotification(
                (string) $order['pharmacy_id'],
                'pharmacy_order_created',
                'Nouvelle commande pharmacie',
                'Une ordonnance vous a été transmise.',
                ['pharmacy_order_id' => $order['id'], 'pharmacy_order_side' => PharmacyOrderNotifier::SIDE_RECEIVED],
            );
            $pharmacyNotify->maybeSendOrderEmail(
                (string) $order['pharmacy_id'],
                'Nouvelle commande pharmacie',
                'Une ordonnance vous a été transmise sur Cary.',
                '/pro/commandes-recues/' . $order['id'],
            );
            $orderService->markCreationResponseCompleted($user, $body);
        }
        echo json_encode(['success' => true, 'data' => $order]);
    } catch (AppointmentCreationConflict $e) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'error' => 'Cette commande a déjà été envoyée avec des informations différentes. Consultez vos commandes avant de recommencer.',
            'code' => 'CREATION_REQUEST_CONFLICT',
        ]);
    } catch (InvalidArgumentException $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    } catch (PDOException $e) {
        ApiServerError::respond('création commande pharmacie user=' . ($user['user_id'] ?? ''), $e, 'La commande n’a pas pu être envoyée. Réessayez plus tard.');
    } catch (RuntimeException $e) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);

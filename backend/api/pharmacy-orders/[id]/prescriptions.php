<?php

declare(strict_types=1);

require_once __DIR__ . '/../../pharmacy/_helpers.php';
require_once __DIR__ . '/../../../lib/NotificationService.php';
require_once __DIR__ . '/../../../lib/ApiServerError.php';

[$user, $db, $moduleConfig, $orderService] = pharmacyApiBootstrap(['POST', 'OPTIONS']);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$orderId = trim((string) ($_GET['id'] ?? ''));
if ($orderId === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID requis']);
    exit;
}

$order = $orderService->getById($orderId);
if ($order === null) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Commande introuvable']);
    exit;
}
if (!PharmacyOrderAccess::canView($user, $order)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
    exit;
}

$body = json_decode(file_get_contents('php://input') ?: '{}', true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'JSON invalide']);
    exit;
}

try {
    $updated = $orderService->attachPrescriptions($user, $orderId, $body['document_ids'] ?? null);
    $notifications = new NotificationService();
    (new PharmacyOrderNotifier(fn (...$args) => $notifications->createNotification(...$args)))
        ->prescriptionsAdded($updated, $order['status'] === 'complement_demande' && $updated['status'] === 'en_attente');
    $updated['can_attach_prescriptions'] = PharmacyOrderAccess::canAttachPrescriptions($user, $updated);
    echo json_encode(['success' => true, 'data' => $updated]);
} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} catch (DomainException $e) {
    http_response_code(409);
    echo json_encode(['success' => false, 'error' => $e->getMessage(), 'code' => 'PHARMACY_ORDER_LOCKED']);
} catch (PDOException $e) {
    ApiServerError::respond(
        'ajout ordonnance commande pharmacie ' . $orderId . ' user=' . ($user['user_id'] ?? ''),
        $e,
        'L’ordonnance n’a pas pu être ajoutée. Réessayez plus tard.',
    );
} catch (RuntimeException $e) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

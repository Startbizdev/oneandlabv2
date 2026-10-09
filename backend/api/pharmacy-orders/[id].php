<?php

declare(strict_types=1);

require_once __DIR__ . '/../pharmacy/_helpers.php';
require_once __DIR__ . '/../../lib/NotificationService.php';
require_once __DIR__ . '/../../lib/pharmacy/PharmacyOrderAccess.php';
require_once __DIR__ . '/../../lib/pharmacy/PharmacyNotificationHelper.php';
require_once __DIR__ . '/../../lib/ApiServerError.php';

[$user, $db, $moduleConfig, $orderService] = pharmacyApiBootstrap(['GET', 'PATCH', 'OPTIONS']);
$notifications = new NotificationService();
$pharmacyNotify = new PharmacyNotificationHelper($db);
$orderNotifier = new PharmacyOrderNotifier(fn (...$args) => $notifications->createNotification(...$args));

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

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $order['can_attach_prescriptions'] = PharmacyOrderAccess::canAttachPrescriptions($user, $order);
    echo json_encode(['success' => true, 'data' => $order]);
    exit;
}

if ($method === 'PATCH') {
    $body = json_decode(file_get_contents('php://input') ?: '{}', true);
    if (!is_array($body)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'JSON invalide']);
        exit;
    }
    $newStatus = isset($body['status']) ? trim((string) $body['status']) : '';
    if ($newStatus === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Statut requis']);
        exit;
    }
    try {
        $updated = $orderService->updateStatus($user, $orderId, $newStatus, $body);
        if ($newStatus === 'annulee') {
            $orderNotifier->orderCancelled($updated, (string) ($user['user_id'] ?? ''));
        }
        $notifyType = match ($newStatus) {
            'acceptee' => 'pharmacy_order_accepted',
            'refusee' => 'pharmacy_order_refused',
            'complement_demande' => 'pharmacy_order_complement_requested',
            'terminee' => 'pharmacy_order_completed',
            default => null,
        };
        if ($notifyType !== null) {
            $notificationCopy = match ($newStatus) {
                'acceptee' => ['Commande acceptée', 'La pharmacie a accepté votre commande.'],
                'refusee' => ['Commande refusée', 'La pharmacie a refusé votre commande.'],
                'complement_demande' => ['Complément demandé', 'La pharmacie attend un complément pour votre commande.'],
                'terminee' => ['Commande terminée', 'Votre commande est prête ou a été livrée.'],
                default => ['Commande mise à jour', 'Le statut de votre commande a changé.'],
            };
            $notificationData = ['pharmacy_order_id' => $orderId, 'pharmacy_order_side' => PharmacyOrderNotifier::SIDE_SENT];
            $notifications->createNotification(
                (string) $updated['requester_id'],
                $notifyType,
                $notificationCopy[0],
                $notificationCopy[1],
                $notificationData,
            );
            if (
                (string) $updated['patient_id'] !== (string) $updated['requester_id']
                && in_array($newStatus, ['acceptee', 'refusee', 'terminee'], true)
            ) {
                $notifications->createNotification(
                    (string) $updated['patient_id'],
                    $notifyType,
                    $notificationCopy[0],
                    $notificationCopy[1],
                    $notificationData,
                );
            }
            $requesterRole = (string) ($updated['requester_role'] ?? 'pro');
            $rolePath = $requesterRole === 'patient' ? 'patient/traitements' : $requesterRole . '/commandes-pharmacie';
            $pharmacyNotify->maybeSendOrderEmail(
                (string) $updated['requester_id'],
                $notificationCopy[0],
                $notificationCopy[1],
                '/' . $rolePath . '/' . $orderId,
            );
        }
        echo json_encode(['success' => true, 'data' => $updated]);
    } catch (InvalidArgumentException $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    } catch (PDOException $e) {
        ApiServerError::respond('statut commande pharmacie ' . $orderId . ' user=' . ($user['user_id'] ?? ''), $e, 'La mise à jour de la commande a échoué. Réessayez plus tard.');
    } catch (RuntimeException $e) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);

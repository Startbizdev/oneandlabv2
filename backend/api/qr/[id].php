<?php

/**
 * Redirection HTTP 302 depuis /api/qr/{token} (scan QR code).
 */
require_once __DIR__ . '/../../lib/QrCodeService.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$token = isset($_GET['id']) ? trim((string) $_GET['id']) : '';
if ($token === '') {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'token requis']);
    exit;
}

try {
    $service = new QrCodeService();
    $data = $service->resolveToken($token, [
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'referrer' => $_SERVER['HTTP_REFERER'] ?? '',
        'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
    ]);
    $redirect = trim((string) ($data['redirect_url'] ?? ''));
    if ($redirect === '') {
        throw new RuntimeException('Redirection introuvable', 404);
    }
    header('Location: ' . $redirect, true, 302);
    header('Cache-Control: no-store');
    exit;
} catch (RuntimeException $e) {
    $code = (int) $e->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 404;
    }
    http_response_code($code);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>QR introuvable</title></head>';
    echo '<body style="font-family:sans-serif;text-align:center;padding:48px;color:#334155">';
    echo '<h1>QR code introuvable</h1><p>Ce lien n\'est plus valide.</p></body></html>';
    exit;
} catch (Throwable $e) {
    error_log('qr/[id] redirect: ' . $e->getMessage());
    http_response_code(500);
    header('Content-Type: text/html; charset=utf-8');
    echo 'Erreur serveur';
    exit;
}

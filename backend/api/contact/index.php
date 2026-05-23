<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../lib/Email.php';
require_once __DIR__ . '/../../lib/RateLimit.php';
$corsConfig = require __DIR__ . '/../../config/cors.php';

$origin = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '';
if ($origin && in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} elseif ($origin) {
} else {
    header('Access-Control-Allow-Origin: http://localhost:3000');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$contactIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
if (!RateLimit::allow('contact', $contactIp, 10, 60)) {
    http_response_code(429);
    echo json_encode(['success' => false, 'error' => 'Trop de requêtes. Réessayez dans une minute.']);
    exit;
}

$CONTACT_TO = 'contact@oneandlab.fr';

$typeLabels = [
    'rdv' => 'Problème avec un rendez-vous',
    'partenariat_labo' => 'Partenariat laboratoire',
    'partenariat_infirmier' => 'Partenariat infirmier',
    'question' => 'Question générale',
    'reclamation' => 'Réclamation',
    'autre' => 'Autre',
];

try {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $name = trim((string) ($input['name'] ?? ''));
    $email = trim((string) ($input['email'] ?? ''));
    $contactType = trim((string) ($input['contactType'] ?? ''));
    $message = trim((string) ($input['message'] ?? ''));

    if ($name === '') {
        throw new Exception('Le nom est requis.');
    }
    if ($email === '') {
        throw new Exception('L\'email est requis.');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Adresse email invalide.');
    }
    if (!isset($typeLabels[$contactType])) {
        throw new Exception('Veuillez choisir un motif de contact.');
    }
    if ($message === '') {
        throw new Exception('Le message est requis.');
    }

    $typeLabel = $typeLabels[$contactType];
    $subject = '[Cary Contact] ' . $typeLabel . ' — ' . $name;

    $inner = '<p style="margin:0 0 12px 0;"><strong>Motif :</strong> ' . htmlspecialchars($typeLabel) . '</p>'
        . '<p style="margin:0 0 12px 0;"><strong>Nom :</strong> ' . htmlspecialchars($name) . '</p>'
        . '<p style="margin:0 0 12px 0;"><strong>Email :</strong> ' . htmlspecialchars($email) . '</p>'
        . '<p style="margin:0 0 8px 0;"><strong>Message :</strong></p>'
        . '<p style="margin:0;white-space:pre-wrap;">' . nl2br(htmlspecialchars($message)) . '</p>';

    $emailLib = new Email();
    $body = $emailLib->buildStaffInquiryBody('Nouveau message — formulaire contact', $inner);
    $sent = $emailLib->send($CONTACT_TO, $subject, $body, true, $email, $name);

    if (!$sent) {
        throw new Exception('L\'envoi du message a échoué. Veuillez réessayer ou nous écrire à ' . $CONTACT_TO . '.');
    }

    echo json_encode(['success' => true, 'message' => 'Message envoyé. Nous vous répondrons rapidement.']);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

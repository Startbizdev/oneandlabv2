<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../lib/Email.php';
require_once __DIR__ . '/../../lib/RateLimit.php';
require_once __DIR__ . '/../../lib/ApiServerError.php';
require_once __DIR__ . '/../../lib/ContactInquiry.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
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

$CONTACT_TO = (require __DIR__ . '/../../config/app.php')['contact_email'];

$typeLabels = [
    'app_mobile' => 'Assistance application Cary (mobile)',
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
        throw new InvalidArgumentException('Le nom est requis.');
    }
    if ($email === '') {
        throw new InvalidArgumentException('L\'email est requis.');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('Adresse email invalide.');
    }
    if (!isset($typeLabels[$contactType])) {
        throw new InvalidArgumentException('Veuillez choisir un motif de contact.');
    }
    if ($message === '') {
        throw new InvalidArgumentException('Le message est requis.');
    }

    // Formulaire public : le compte n'est joint que si la session est valide ; tout bloc "context" envoyé par le client est ignoré.
    $authUser = AuthMiddleware::authorizationHeader() !== null ? (new AuthMiddleware())->tryAuthenticate() : null;
    $accountRows = $authUser !== null ? ContactInquiry::accountRows($authUser, new User()) : [];
    $clientRows = ContactInquiry::clientRows($input['client'] ?? null);

    $typeLabel = $typeLabels[$contactType];
    $subject = '[Cary Contact] ' . $typeLabel . ' — ' . $name;
    $inner = ContactInquiry::innerHtml($typeLabel, $name, $email, $message, $accountRows, $clientRows);

    $emailLib = new Email();
    $body = $emailLib->buildStaffInquiryBody('Nouveau message — formulaire contact', $inner);
    $sent = $emailLib->send($CONTACT_TO, $subject, $body, true, $email, $name);

    if (!$sent) {
        ApiServerError::respond(
            'formulaire contact user=' . ($authUser['user_id'] ?? 'anonyme'),
            new RuntimeException('Échec de l\'envoi de l\'e-mail de contact'),
            'L\'envoi du message a échoué. Veuillez réessayer ou nous écrire à ' . $CONTACT_TO . '.'
        );
        exit;
    }

    echo json_encode(['success' => true, 'message' => 'Message envoyé. Nous vous répondrons rapidement.']);
} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} catch (Throwable $e) {
    ApiServerError::respond(
        'formulaire contact',
        $e,
        'L\'envoi du message a échoué. Veuillez réessayer ou nous écrire à ' . $CONTACT_TO . '.'
    );
}

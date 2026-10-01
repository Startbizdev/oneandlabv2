<?php



header('Content-Type: application/json');

require_once __DIR__ . '/../../config/database.php';

require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';

require_once __DIR__ . '/../../models/Appointment.php';

require_once __DIR__ . '/../../lib/Validation.php';

require_once __DIR__ . '/../../config/cors.php';

require_once __DIR__ . '/../../lib/StaffPatientConsent.php';

require_once __DIR__ . '/../../lib/AppointmentRequestFingerprint.php';

require_once __DIR__ . '/../../lib/appointments/bootstrap.php';



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



// Authentification requise pour GET (liste filtrée par rôle) et POST

$user = null;

try {

    $authMiddleware = new AuthMiddleware();

    $user = $authMiddleware->handle();

    AppointmentApiLogging::logAppointment('Authentification réussie', ['user_id' => $user['user_id'] ?? null, 'role' => $user['role'] ?? null]);



    // Vérifier CSRF pour les requêtes modifiantes

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {

        CSRFMiddleware::handle();

    }

} catch (Exception $e) {

    AppointmentApiLogging::logAppointment('ERREUR lors de l\'authentification', ['error' => $e->getMessage()]);

    ApiServerError::respond('authentification rendez-vous', $e);

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

$appointmentModel = new Appointment($db);

$listEnricher = new AppointmentListEnricher();

$postCreateEffects = new AppointmentPostCreateEffects($db);



if ($_SERVER['REQUEST_METHOD'] === 'GET') {

    AppointmentListGetHandler::handle($db, $appointmentModel, $listEnricher, $user);

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {

    AppointmentCreatePostHandler::handle($db, $appointmentModel, $postCreateEffects, $user);

} else {

    http_response_code(405);

    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);

}


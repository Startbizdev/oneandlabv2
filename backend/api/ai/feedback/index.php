<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../lib/ai/AiFeedbackService.php';

ai_handle_options(['POST', 'OPTIONS']);
$user = ai_require_user(['patient', 'pro', 'nurse', 'preleveur']);

try {
    $service = new AiFeedbackService();
    $result = $service->submit($user, ai_read_json_body());
    ai_json_response(['success' => true, 'data' => $result], 201);
} catch (InvalidArgumentException $e) {
    ai_json_error($e->getMessage(), 400);
}

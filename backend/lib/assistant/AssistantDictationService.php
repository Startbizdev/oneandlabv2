<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/AssistantProvider.php';
require_once __DIR__ . '/AssistantTools.php';
require_once __DIR__ . '/PrivacyGateway.php';
require_once __DIR__ . '/../RateLimit.php';
require_once __DIR__ . '/../Validation.php';
require_once __DIR__ . '/../PatientDossierAccess.php';
require_once __DIR__ . '/../appointments/AppointmentDetailAccess.php';
require_once __DIR__ . '/../../models/User.php';

/** Dictée → transmission mise en forme : un appel LLM non streamé, barrière appliquée, rien n'est stocké. */
final class AssistantDictationService
{
    public const SYSTEM = 'Tu mets en forme une transmission infirmière dictée. Français clair, phrases courtes, '
        . 'vocabulaire soignant. N\'ajoute aucune information absente de la dictée, ne pose aucun diagnostic. '
        . 'Garde les alias (« Patient A ») tels quels. Réponds uniquement par le texte de la transmission.';

    public function __construct(private readonly PDO $db, private ?AssistantProvider $provider = null)
    {
    }

    public function format(array $user, array $input): string
    {
        $transcript = is_string($input['transcript'] ?? null) ? trim($input['transcript']) : '';
        if ($transcript === '' || mb_strlen($transcript) > 8000) {
            throw AssistantError::validation('La dictée doit contenir entre 1 et 8000 caractères');
        }
        $patientId = is_string($input['patient_id'] ?? null) ? strtolower($input['patient_id']) : '';
        $appointmentId = $input['appointment_id'] ?? null;
        if (!Validation::uuid($patientId) || ($appointmentId !== null && (!is_string($appointmentId) || !Validation::uuid($appointmentId)))) {
            throw AssistantError::validation('patient_id (et appointment_id) doivent être des UUID');
        }
        if (!PatientDossierAccess::canAccess($this->db, new User($this->db), $user, $patientId)) {
            throw new AssistantError('Accès au dossier refusé', 403, 'FORBIDDEN');
        }
        if ($appointmentId !== null) {
            $access = AppointmentDetailAccess::loadAccessContext($this->db, $appointmentId);
            if ($access === null || !AppointmentDetailAccess::userHasDetailAccess($this->db, $user, $access['row'], $access['id'], $access['has_creation_batch_column'])) {
                throw new AssistantError('Accès au rendez-vous refusé', 403, 'FORBIDDEN');
            }
        }
        if (!RateLimit::allow('assistant_dictation', (string) $user['user_id'], 60, 3600)) {
            $retry = RateLimit::retryAfterSeconds('assistant_dictation', (string) $user['user_id'], 3600);
            throw new AssistantError('Trop de dictées — réessayez dans quelques minutes.', 429, 'ASSISTANT_RATE_LIMITED', $retry);
        }

        $gateway = new PrivacyGateway();
        (new AssistantTools($this->db, $user, $patientId, $gateway, static function (): void {
        }))->registerKnownNames();
        $this->provider ??= AssistantProviderFactory::create();
        $result = $this->provider->stream(
            [['role' => 'system', 'content' => self::SYSTEM], ['role' => 'user', 'content' => $gateway->mask($transcript)]],
            [],
            static function (): void {
            },
            static function (): void {
            },
        );
        $text = trim($gateway->rehydrate($result['content']));
        if ($text === '') {
            throw AssistantError::unavailable('Dictée : réponse vide');
        }

        return $text;
    }
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/AssistantProvider.php';
require_once __DIR__ . '/AssistantConversationRepository.php';
require_once __DIR__ . '/AssistantEmergencyDetector.php';
require_once __DIR__ . '/AssistantTools.php';
require_once __DIR__ . '/AssistantPrompt.php';
require_once __DIR__ . '/AssistantIntent.php';
require_once __DIR__ . '/AssistantDocumentReader.php';
require_once __DIR__ . '/PrivacyGateway.php';
require_once __DIR__ . '/PatientMentions.php';
require_once __DIR__ . '/../AppTimezone.php';
require_once __DIR__ . '/../RateLimit.php';
require_once __DIR__ . '/../Validation.php';
require_once __DIR__ . '/../PatientDossierAccess.php';
require_once __DIR__ . '/../../models/User.php';

/**
 * Un tour de conversation : validation, idempotence (client_message_id), urgence sans LLM, barrière de données,
 * stream du fournisseur avec au plus 3 tours d'outils, réhydratation des alias, stockage chiffré.
 * prepare() lève les erreurs avant l'ouverture du flux SSE (réponse JSON) ; run() n'émet plus que des événements.
 */
final class AssistantChatService
{
    public const CONTEXT_TYPES = ['appointment', 'lab_result', 'patient', 'health', 'general'];
    private const MAX_MESSAGE = 4000;
    private const HISTORY = 10;
    private const MAX_ROUNDS = 4;
    private const RATE_LIMIT = 60;
    private const FALLBACK = 'Je n\'ai pas pu formuler de réponse. Pouvez-vous reformuler votre question ?';

    private AssistantConversationRepository $repo;
    /** Patient du tour après lecture de la question (soignant) : renvoyé à l'app avec la réponse. */
    private ?string $turnPatientId = null;

    public function __construct(private readonly PDO $db, private ?AssistantProvider $provider = null)
    {
        $this->repo = new AssistantConversationRepository($db);
    }

    /** @return array<string, mixed> tour prêt à être streamé */
    public function prepare(array $user, array $input): array
    {
        $userId = (string) $user['user_id'];
        $message = is_string($input['message'] ?? null) ? trim($input['message']) : '';
        if ($message === '' || mb_strlen($message) > self::MAX_MESSAGE) {
            throw AssistantError::validation('Le message doit contenir entre 1 et 4000 caractères');
        }
        $clientMessageId = self::uuid($input, 'client_message_id', true);
        $conversationId = self::uuid($input, 'conversation_id', false);
        $patientId = self::uuid($input, 'patient_id', false);
        $documentId = is_string($input['document_id'] ?? null) && $input['document_id'] !== '' ? $input['document_id'] : null;
        $context = self::context($input['context'] ?? null);

        $turn = $this->repo->findUserTurn($userId, $clientMessageId);
        if ($turn !== null) {
            $reply = $this->repo->findReply((string) $turn['conversation_id'], $clientMessageId);
            if ($reply !== null) {
                return ['replay' => $reply, 'conversation_id' => (string) $turn['conversation_id'], 'user_message_id' => (string) $turn['id']];
            }
            if (!$this->repo->isStale($turn)) {
                throw AssistantError::inProgress();
            }
            $this->repo->deleteMessage((string) $turn['id']);
            $conversationId = (string) $turn['conversation_id'];
        }
        $conversation = $conversationId !== null ? $this->repo->find($conversationId, $userId) : null;
        if ($conversationId !== null && $conversation === null) {
            throw new AssistantError('Conversation introuvable', 404, 'NOT_FOUND');
        }
        $patientId ??= $conversation['patient_id'] ?? null;
        if ($patientId !== null && !PatientDossierAccess::canAccess($this->db, new User($this->db), $user, $patientId)) {
            throw new AssistantError('Accès au dossier refusé', 403, 'FORBIDDEN');
        }
        if (!RateLimit::allow('assistant_chat', $userId, self::RATE_LIMIT, 3600)) {
            $retry = RateLimit::retryAfterSeconds('assistant_chat', $userId, 3600);
            throw new AssistantError('Vous envoyez beaucoup de messages — réessayez dans quelques minutes.', 429, 'ASSISTANT_RATE_LIMITED', $retry);
        }
        $emergency = AssistantEmergencyDetector::detect($message);
        $document = null;
        if ($emergency === null) {
            $this->provider ??= AssistantProviderFactory::create();
            $document = $documentId !== null ? AssistantDocumentReader::read($this->db, $user, $documentId) : null;
        }
        $conversation ??= $this->repo->create($userId, $patientId, $context, mb_substr($message, 0, 60));
        try {
            // Pièce jointe gardée avec le message de l'utilisateur : l'app l'affiche sous sa question, comme une pièce de courriel.
            $attachment = $document !== null ? [['type' => 'attachment', 'label' => $document['name'], 'params' => ['document_id' => $documentId]]] : null;
            $userMessageId = $this->repo->addMessage((string) $conversation['id'], 'user', $message, [], $clientMessageId, 'pending', $attachment);
        } catch (PDOException $e) {
            if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
                throw AssistantError::inProgress();
            }
            throw $e;
        }

        return [
            'user' => $user, 'message' => $message, 'client_message_id' => $clientMessageId, 'patient_id' => $patientId,
            'context' => $context ?? self::context(['type' => $conversation['context_type'] ?? null, 'id' => $conversation['context_id'] ?? null]),
            'conversation_id' => (string) $conversation['id'], 'user_message_id' => $userMessageId,
            'emergency' => $emergency, 'document' => $document,
        ];
    }

    /** @param callable(string, array<string, mixed>): void $send */
    public function run(array $turn, callable $send): void
    {
        $send('start', ['conversation_id' => $turn['conversation_id'], 'user_message_id' => $turn['user_message_id']]);
        try {
            if (isset($turn['replay'])) {
                $reply = $turn['replay'];
                $send('delta', ['text' => $reply['text']]);
                $send('done', ['message_id' => $reply['id'], 'conversation_id' => $turn['conversation_id'], 'text' => $reply['text'], 'actions' => $reply['actions']]);
            } else {
                [$text, $actions, $stored, $names, $usage] = $turn['emergency'] !== null
                    ? $this->emergency($turn['emergency'], $send)
                    : $this->converse($turn, $send);
                $messageId = $this->repo->addMessage($turn['conversation_id'], 'assistant', $text, $names, $turn['client_message_id'], 'done', $stored, $usage);
                $this->repo->setStatus($turn['user_message_id'], 'done');
                $send('done', array_filter([
                    'message_id' => $messageId, 'conversation_id' => $turn['conversation_id'], 'text' => $text, 'actions' => $actions,
                    'patient_id' => $this->turnPatientId ?? $turn['patient_id'],
                ], static fn ($v) => $v !== null));
            }
        } catch (Throwable $e) {
            $this->repo->setStatus($turn['user_message_id'], 'error');
            $error = assistant_describe_error($e, 'assistant/chat');
            $send('error', array_filter(['code' => $error['code'], 'message' => $error['message'], 'retry_after' => $error['retry_after']], static fn ($v) => $v !== null));
        }
        $send('end', []);
    }

    /** @return array{0: string, 1: list<array<string, mixed>>, 2: list<array<string, mixed>>, 3: list<mixed>, 4: array<string, mixed>} */
    private function emergency(array $emergency, callable $send): array
    {
        $send('emergency', ['message' => $emergency['message'], 'number' => $emergency['number']]);
        $actions = [];
        foreach ($emergency['numbers'] as $number) {
            $actions[] = $action = ['type' => 'call_emergency', 'label' => 'Appeler le ' . $number, 'params' => ['number' => $number]];
            $send('action', $action);
        }
        $send('delta', ['text' => $emergency['message']]);

        return [$emergency['message'], $actions, $actions, [], ['model' => 'emergency_rules']];
    }

    /** @return array{0: string, 1: list<array<string, mixed>>, 2: list<array<string, mixed>>, 3: list<mixed>, 4: array<string, mixed>} */
    private function converse(array $turn, callable $send): array
    {
        $started = microtime(true);
        $user = $turn['user'];
        $gateway = new PrivacyGateway();
        $actions = [];
        $stored = [];
        $question = (string) $turn['message'];
        $careType = AssistantIntent::careType($question);
        // Le patient qui demande un rendez-vous obtient toujours la carte, avec le soin présélectionné.
        $bookingTurn = $user['role'] === 'patient' && $turn['document'] === null && AssistantIntent::wantsBooking($question);
        // Jour et plage horaire calculés par règles fixes : la carte les porte même si le modèle les oublie.
        $slot = $bookingTurn ? AssistantIntent::slot($question, AppTimezone::now()) : [];
        $db = $this->db;
        $emit = static function (array $action) use ($db, $gateway, $send, $careType, $slot, $question, &$actions, &$stored): void {
            if ($action['type'] === 'book_appointment') {
                // Soin présélectionné seulement s'il répond au besoin décrit (« plaie » → pansement), jamais au hasard.
                if (isset($action['params']['category_id']) && !self::careMatchesQuestion($db, (string) $action['params']['category_id'], $question)) {
                    unset($action['params']['category_id']);
                }
                $action['params']['category_id'] ??= self::onlyMatchingCare($db, $question);
                if ($action['params']['category_id'] === null) {
                    unset($action['params']['category_id']);
                }
                if (!isset($action['params']['care_type']) && $careType !== null) {
                    $action['params']['care_type'] = $careType;
                }
                // Le créneau calculé prime ; une heure écrite « 08:00 » par le modèle devient « 8 », comme l'attend l'app.
                $action['params'] = $slot + $action['params'];
                foreach (['time_from', 'time_to'] as $key) {
                    if (isset($action['params'][$key])) {
                        $hour = preg_match('/^\s*(\d{1,2})/', $action['params'][$key], $m) === 1 ? (int) $m[1] : -1;
                        if ($hour >= 0 && $hour <= 24) {
                            $action['params'][$key] = (string) $hour;
                        } else {
                            unset($action['params'][$key]);
                        }
                    }
                }
            }
            $stored[] = ['type' => $action['type'], 'label' => $action['label'], 'params' => array_diff_key($action['params'], ['body' => true])];
            $live = ['type' => $action['type'], 'label' => $gateway->rehydrate($action['label']), 'params' => array_map([$gateway, 'rehydrate'], $action['params'])];
            $actions[] = $live;
            $send('action', $live);
        };
        // Soignant : le patient nommé dans la question devient le dossier de la conversation ; plusieurs = on demande lequel.
        $patientNote = null;
        if ($user['role'] !== 'patient') {
            $named = PatientMentions::resolve(PatientMentions::followed($this->db, $user), $question);
            if (count($named) === 1 && $named[0]['id'] !== $turn['patient_id']) {
                $turn['patient_id'] = $named[0]['id'];
                $this->repo->setPatient($turn['conversation_id'], $turn['patient_id']);
            } elseif (count($named) > 1) {
                $choices = [];
                foreach (array_slice($named, 0, 5) as $candidate) {
                    $age = PrivacyGateway::ageFromBirthDate($candidate['birth_date']);
                    $choices[] = $gateway->alias($candidate['name'], 'Patient') . ($age !== null ? ' (' . $age . ' ans)' : '');
                }
                $patientNote = 'Plusieurs patients suivis correspondent : ' . implode(', ', $choices) . '. Demande lequel en les citant, sans consulter de dossier.';
            }
        }
        $this->turnPatientId = $turn['patient_id'];
        $tools = new AssistantTools($this->db, $user, $turn['patient_id'], $gateway, $emit);
        $patientAlias = $tools->registerKnownNames();
        $history = $this->repo->recentMessages($turn['conversation_id'], self::HISTORY);
        foreach ($history as $past) {
            foreach ($past['names'] as [$name, $kind]) {
                $gateway->alias((string) $name, (string) $kind);
            }
        }

        $system = AssistantPrompt::system((string) $user['role'], $patientAlias, $turn['patient_id'], $turn['context']);
        if ($patientNote !== null) {
            $system .= "\n" . $patientNote;
        }
        $transmissionTurn = $user['role'] !== 'patient' && $turn['patient_id'] !== null && AssistantIntent::wantsTransmission($question);
        if ($transmissionTurn) {
            $system .= "\nDemande de transmission : appelle d'abord propose_action create_transmission (patient_id, body = le texte mis en forme), puis montre ce texte en une ou deux phrases.";
        }
        if ($bookingTurn) {
            $understood = array_filter([
                isset($slot['date']) ? AssistantTools::dayLabel($slot['date']) : null,
                isset($slot['time_from']) ? 'entre ' . $slot['time_from'] . ' h et ' . $slot['time_to'] . ' h' : null,
            ]);
            $system .= "
Demande de rendez-vous : appelle propose_action book_appointment" . ($careType !== null ? ' (params.care_type = ' . $careType . ')' : '')
                . ' sans consulter les rendez-vous (list_care_categories pour choisir la catégorie qui répond au besoin décrit, aucune si la demande est vague)'
                . ($understood !== [] ? ', avec le créneau compris : ' . implode(', ', $understood) : '')
                . '. Puis dis en une ou deux phrases que la réservation est préparée, à vérifier puis confirmer'
                . ($understood !== [] ? ', en reprenant ce créneau tel quel' : '') . '. N\'écris jamais de code technique (blood_test, nursing, identifiant).';
        }
        $messages = [['role' => 'system', 'content' => $system]];
        foreach ($history as $past) {
            $messages[] = ['role' => $past['role'], 'content' => $gateway->mask($past['text'])];
        }
        $messages[] = ['role' => 'user', 'content' => $this->userContent($gateway, $turn['message'], $turn['document'])];

        $answer = '';
        $fallback = null;
        $usage = ['model' => null, 'input_tokens' => null, 'output_tokens' => null];
        $onDelta = static function (string $text) use ($gateway, $send, &$answer): void {
            $piece = $gateway->rehydrateStream($text);
            if ($piece !== '') {
                $answer .= $piece;
                $send('delta', ['text' => $piece]);
            }
        };
        // propose_action ne consulte rien : pas de statut (la carte s'affiche directement).
        $onToolCall = static function (string $name) use ($send): void {
            if ($name !== 'propose_action') {
                $send('status', ['text' => AssistantTools::STATUS[$name] ?? 'Je consulte vos informations…']);
            }
        };
        // Patient ambigu : aucune consultation possible ce tour-ci, la seule réponse utile est de demander lequel.
        $definitions = $patientNote === null ? AssistantTools::definitions((string) $user['role']) : [];
        for ($round = 1; $round <= self::MAX_ROUNDS; $round++) {
            $result = $this->provider->stream($messages, $round < self::MAX_ROUNDS ? $definitions : [], $onDelta, $onToolCall);
            $usage['model'] = $result['model'];
            foreach (['input_tokens', 'output_tokens'] as $key) {
                $usage[$key] = $result[$key] !== null ? (int) $usage[$key] + $result[$key] : $usage[$key];
            }
            if ($result['tool_calls'] === []) {
                break;
            }
            $calls = [];
            foreach ($result['tool_calls'] as $i => $call) {
                $calls[] = ['id' => $call['id'] !== '' ? $call['id'] : 'call_' . $round . '_' . $i, 'name' => $call['name'], 'arguments' => $call['arguments']];
            }
            $messages[] = ['role' => 'assistant', 'content' => $result['content'] !== '' ? $result['content'] : null, 'tool_calls' => array_map(
                static fn (array $c): array => ['id' => $c['id'], 'type' => 'function', 'function' => ['name' => $c['name'], 'arguments' => json_encode((object) $c['arguments'], JSON_UNESCAPED_UNICODE)]],
                $calls,
            )];
            foreach ($calls as $call) {
                $output = $tools->execute($call['name'], $call['arguments']);
                $fallback = self::fallbackAction($call['name'], $output, (string) $user['role']) ?? $fallback;
                $messages[] = ['role' => 'tool', 'tool_call_id' => $call['id'], 'content' => json_encode($output, JSON_UNESCAPED_UNICODE)];
            }
        }
        // Filet de sécurité : la carte utile est garantie même si le modèle l'oublie.
        $types = array_column($actions, 'type');
        if ($bookingTurn && !in_array('book_appointment', $types, true)) {
            $emit(['type' => 'book_appointment', 'label' => 'Prendre rendez-vous', 'params' => []]);
        } elseif ($actions === [] && $fallback !== null) {
            $emit($fallback);
        } elseif ($actions === [] && $turn['patient_id'] !== null && in_array($user['role'], ['nurse', 'pro'], true)) {
            // Réponse sur un patient sans bouton proposé : les suites logiques (transmission demandée, dossier).
            $body = $transmissionTurn ? AssistantIntent::transmissionBody($answer) : '';
            if ($body !== '') {
                $emit(['type' => 'create_transmission', 'label' => 'Créer la transmission', 'params' => ['patient_id' => (string) $turn['patient_id'], 'body' => $body]]);
            }
            $emit(['type' => 'open_health_record', 'label' => 'Ouvrir le dossier', 'params' => ['patient_id' => (string) $turn['patient_id']]]);
        }
        $tail = $gateway->flush();
        if ($tail !== '') {
            $answer .= $tail;
            $send('delta', ['text' => $tail]);
        }
        if (trim($answer) === '') {
            $answer = self::FALLBACK;
            $send('delta', ['text' => $answer]);
        }
        if ($actions === []) {
            $answer = self::withoutButtonMentions($answer);
        }
        $usage['latency_ms'] = (int) round((microtime(true) - $started) * 1000);

        return [$answer, $actions, $stored, $gateway->names(), $usage];
    }

    /**
     * Bouton déduit de la dernière consultation, quand le modèle n'en propose aucun.
     *
     * @param array<string, mixed> $output
     * @return array{type: string, label: string, params: array<string, string>}|null
     */
    private static function fallbackAction(string $tool, array $output, string $role): ?array
    {
        return match (true) {
            $tool === 'get_my_appointments' && ($output['period'] ?? '') === 'upcoming' && isset($output['items'][0]['id'])
                => ['type' => 'open_appointment', 'label' => 'Voir le prochain rendez-vous', 'params' => ['id' => (string) $output['items'][0]['id']]],
            $tool === 'get_lab_results' && $role === 'patient' && !isset($output['error'])
                => ['type' => 'open_lab_results', 'label' => 'Voir mes résultats', 'params' => []],
            $tool === 'get_tour' && !isset($output['error'])
                => ['type' => 'open_tour', 'label' => 'Voir ma tournée', 'params' => isset($output['date']) ? ['date' => (string) $output['date']] : []],
            default => null,
        };
    }

    /**
     * Retire les phrases qui annoncent un bouton quand aucun n'est affiché (« utilisez le bouton ci-dessous ») :
     * la réponse finale, qui remplace le texte reçu en direct, ne promet jamais une action absente.
     */
    public static function withoutButtonMentions(string $answer): string
    {
        $clean = (string) preg_replace('/[^.!?\n]*\bboutons?\b[^.!?\n]*[.!?]?/iu', '', $answer);
        $clean = trim((string) preg_replace(['/[ \t]+\n/', '/\n{3,}/', '/ {2,}/'], ["\n", "\n\n", ' '], $clean));

        return $clean !== '' ? $clean : $answer;
    }

    /** Seule catégorie réservable qui répond au besoin décrit ; null si aucune ou plusieurs (le patient choisit). */
    private static function onlyMatchingCare(PDO $db, string $question): ?string
    {
        $found = [];
        foreach ($db->query('SELECT id, name, description FROM care_categories WHERE is_active = 1')->fetchAll(PDO::FETCH_ASSOC) as $row) {
            if (preg_match('/certificat\s+(de\s+)?d[ée]c[èe]s/iu', (string) $row['name']) !== 1
                && AssistantIntent::careMatches((string) $row['name'], (string) ($row['description'] ?? ''), $question)) {
                $found[] = (string) $row['id'];
            }
        }

        return count($found) === 1 ? $found[0] : null;
    }

    /** Le soin choisi par le modèle correspond-il au besoin décrit (nom ou description de la catégorie) ? */
    private static function careMatchesQuestion(PDO $db, string $categoryId, string $question): bool
    {
        $stmt = $db->prepare('SELECT name, description FROM care_categories WHERE id = ? LIMIT 1');
        $stmt->execute([$categoryId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return is_array($row) && AssistantIntent::careMatches((string) $row['name'], (string) ($row['description'] ?? ''), $question);
    }

    private function userContent(PrivacyGateway $gateway, string $message, ?array $document): string|array
    {
        $text = $gateway->mask($message);
        if ($document === null) {
            return $text;
        }
        if ($document['kind'] === 'image') {
            return [['type' => 'text', 'text' => $text], ['type' => 'image_url', 'image_url' => ['url' => $document['data_url']]]];
        }

        return "Document joint (texte extrait, données identifiantes masquées) :\n" . $gateway->mask($document['text']) . "\n\nQuestion : " . $text;
    }

    private static function uuid(array $input, string $key, bool $required): ?string
    {
        $value = $input[$key] ?? null;
        if ($value === null || $value === '') {
            if ($required) {
                throw AssistantError::validation($key . ' est requis');
            }

            return null;
        }
        if (!is_string($value) || !Validation::uuid($value)) {
            throw AssistantError::validation($key . ' doit être un UUID');
        }

        return strtolower($value);
    }

    /** @return array{type: string, id?: string}|null */
    private static function context(mixed $raw): ?array
    {
        if (!is_array($raw) || ($raw['type'] ?? null) === null) {
            return null;
        }
        $type = (string) $raw['type'];
        $id = isset($raw['id']) && $raw['id'] !== '' ? (string) $raw['id'] : null;
        if (!in_array($type, self::CONTEXT_TYPES, true) || ($id !== null && preg_match('/^[A-Za-z0-9-]{1,64}$/', $id) !== 1)) {
            throw AssistantError::validation('context invalide');
        }

        return $id !== null ? ['type' => $type, 'id' => $id] : ['type' => $type];
    }
}

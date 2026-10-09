<?php

declare(strict_types=1);

require_once __DIR__ . '/../Uuid.php';
require_once __DIR__ . '/../Validation.php';
require_once __DIR__ . '/../HttpStatusException.php';
require_once __DIR__ . '/../DatabaseTransaction.php';
require_once __DIR__ . '/../Logger.php';
require_once __DIR__ . '/../PatientDossierAccess.php';
require_once __DIR__ . '/../MedicalDocumentAccess.php';
require_once __DIR__ . '/../appointments/AppointmentDetailAccess.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/AiSourceResolver.php';
require_once __DIR__ . '/bootstrap.php';

final class AiConversationService
{
    public const CONVERSATION_TYPES = [
        'general', 'assistant_health', 'lab_results', 'medical_document', 'appointment', 'health_tracking', 'professional', 'voice',
    ];
    public const CONTEXT_TYPES = ['general', 'appointment', 'lab_result', 'patient'];
    public const MAX_TITLE_LENGTH = 120;
    public const DEFAULT_HISTORY_PAGE = 50;
    public const MAX_HISTORY_PAGE = 200;

    /** Conversations système (clé = type de conversation) et leur titre. */
    private const SYSTEM_CONVERSATIONS = [
        'assistant_health' => 'Mon Assistant Santé',
        'lab_results' => 'Mes résultats',
        'appointment' => 'Mes rendez-vous',
        'health_tracking' => 'Mes données santé',
    ];

    private const CONTEXT_CONVERSATION_TYPES = [
        'appointment' => 'appointment',
        'lab_result' => 'lab_results',
        'patient' => 'professional',
    ];

    private PDO $db;
    private ?User $userModel = null;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? ai_db();
    }

    private function userModel(): User
    {
        return $this->userModel ??= new User();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listForUser(string $userId, int $limit = 50, int $offset = 0, bool $archivedOnly = false): array
    {
        $archiveClause = $archivedOnly ? 'archived_at IS NOT NULL' : 'archived_at IS NULL';
        $stmt = $this->db->prepare("
            SELECT * FROM ai_conversations
            WHERE user_id = ? AND deleted_at IS NULL AND {$archiveClause}
            ORDER BY is_pinned DESC, COALESCE(last_message_at, updated_at) DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->bindValue(1, $userId);
        $stmt->bindValue(2, max(1, min(100, $limit)), PDO::PARAM_INT);
        $stmt->bindValue(3, max(0, $offset), PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map([$this, 'mapConversation'], $rows);
    }

    public function getById(string $id, string $userId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM ai_conversations WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1');
        $stmt->execute([$id, $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? $this->mapConversation($row) : null;
    }

    /**
     * N derniers messages, ordre chronologique (pour le modèle et l'export).
     *
     * @return list<array<string, mixed>>
     */
    public function getMessages(string $conversationId, string $userId, int $limit = 100): array
    {
        if (!$this->getById($conversationId, $userId)) {
            return [];
        }

        return $this->fetchRecent($conversationId, max(1, min(500, $limit)), null)['messages'];
    }

    /**
     * Page d'historique : N messages précédant `before` (ou les derniers), ordre chronologique.
     *
     * @return array{messages: list<array<string, mixed>>, has_more: bool}
     */
    public function getHistoryPage(string $conversationId, string $userId, ?int $limit, ?string $beforeMessageId): array
    {
        if (!$this->getById($conversationId, $userId)) {
            throw HttpStatusException::notFound('Conversation introuvable');
        }
        $pageSize = $limit === null ? self::DEFAULT_HISTORY_PAGE : $limit;
        if ($pageSize < 1 || $pageSize > self::MAX_HISTORY_PAGE) {
            throw new InvalidArgumentException('limit doit être compris entre 1 et ' . self::MAX_HISTORY_PAGE);
        }
        $cursor = null;
        if ($beforeMessageId !== null) {
            $stmt = $this->db->prepare('SELECT created_at, seq FROM ai_messages WHERE id = ? AND conversation_id = ? LIMIT 1');
            $stmt->execute([$beforeMessageId, $conversationId]);
            $cursor = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
            if ($cursor === null) {
                throw HttpStatusException::notFound('Message de référence introuvable');
            }
        }

        return $this->fetchRecent($conversationId, $pageSize, $cursor);
    }

    /**
     * @param array{created_at: ?string, seq: int|string}|null $cursor
     * @return array{messages: list<array<string, mixed>>, has_more: bool}
     */
    private function fetchRecent(string $conversationId, int $limit, ?array $cursor): array
    {
        $where = 'conversation_id = ?';
        $params = [$conversationId];
        if ($cursor !== null) {
            $where .= ' AND (created_at < ? OR (created_at = ? AND seq < ?))';
            array_push($params, $cursor['created_at'], $cursor['created_at'], (int) $cursor['seq']);
        }
        $stmt = $this->db->prepare("
            SELECT * FROM ai_messages
            WHERE {$where}
            ORDER BY created_at DESC, seq DESC
            LIMIT ?
        ");
        foreach ($params as $i => $value) {
            $stmt->bindValue($i + 1, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        $stmt->bindValue(count($params) + 1, $limit + 1, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $hasMore = count($rows) > $limit;

        return [
            'messages' => array_map([$this, 'mapMessage'], array_reverse(array_slice($rows, 0, $limit))),
            'has_more' => $hasMore,
        ];
    }

    /**
     * Crée une conversation, ou renvoie celle qui existe déjà pour (utilisateur, context_type, context_id).
     *
     * @param array<string, mixed> $input
     * @return array{conversation: array<string, mixed>, created: bool}
     */
    public function create(array $user, array $input): array
    {
        $userId = (string) $user['user_id'];
        $contextType = self::optionalString($input['context_type'] ?? null) ?? 'general';
        if (!in_array($contextType, self::CONTEXT_TYPES, true)) {
            throw new InvalidArgumentException('context_type invalide');
        }
        $contextId = self::optionalString($input['context_id'] ?? null);
        $type = self::optionalString($input['conversation_type'] ?? null)
            ?? (self::CONTEXT_CONVERSATION_TYPES[$contextType] ?? 'general');
        if (!in_array($type, self::CONVERSATION_TYPES, true)) {
            throw new InvalidArgumentException('conversation_type invalide');
        }
        $title = self::optionalString($input['custom_title'] ?? null);
        if ($title !== null && mb_strlen($title) > self::MAX_TITLE_LENGTH) {
            throw new InvalidArgumentException('Titre trop long (' . self::MAX_TITLE_LENGTH . ' caractères maximum)');
        }

        if ($contextType === 'general') {
            if ($contextId !== null) {
                throw new InvalidArgumentException('context_id interdit pour une conversation générale');
            }
            $patientId = $this->authorizedPatientId($user, self::optionalString($input['patient_id'] ?? null));
            $storedContextType = null;
        } else {
            if ($contextId === null || !Validation::uuid($contextId)) {
                throw new InvalidArgumentException('context_id (UUID) requis pour ce context_type');
            }
            $patientId = $this->authorizeContext($user, $contextType, $contextId);
            $existing = $this->findByContext($userId, $contextType, $contextId);
            if ($existing !== null) {
                return ['conversation' => $existing, 'created' => false];
            }
            $storedContextType = $contextType;
        }

        $id = Uuid::v4();
        $metadata = !empty($input['metadata']) && is_array($input['metadata']) ? json_encode($input['metadata']) : null;
        try {
            $this->db->prepare('
                INSERT INTO ai_conversations
                    (id, user_id, patient_id, conversation_type, context_type, context_id, custom_title, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ')->execute([$id, $userId, $patientId, $type, $storedContextType, $storedContextType !== null ? $contextId : null, $title, $metadata]);
        } catch (PDOException $e) {
            if ($storedContextType !== null && self::isDuplicateKey($e)) {
                $existing = $this->findByContext($userId, $storedContextType, (string) $contextId);
                if ($existing !== null) {
                    return ['conversation' => $existing, 'created' => false];
                }
            }
            throw $e;
        }

        $this->addMessage($id, 'assistant', $this->welcomeMessage($user, $type));

        return ['conversation' => $this->getById($id, $userId) ?? [], 'created' => true];
    }

    private function findByContext(string $userId, string $contextType, string $contextId): ?array
    {
        $stmt = $this->db->prepare('
            SELECT * FROM ai_conversations
            WHERE user_id = ? AND context_type = ? AND context_id = ? AND deleted_at IS NULL
            LIMIT 1
        ');
        $stmt->execute([$userId, $contextType, $contextId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? $this->mapConversation($row) : null;
    }

    /**
     * Patient rattaché à une conversation générale : soi-même pour un patient, un patient du dossier pour un pro.
     */
    private function authorizedPatientId(array $user, ?string $patientId): ?string
    {
        if ($patientId === null) {
            return null;
        }
        if (!Validation::uuid($patientId)) {
            throw new InvalidArgumentException('patient_id invalide');
        }
        if (!PatientDossierAccess::canAccess($this->db, $this->userModel(), $user, $patientId)) {
            throw HttpStatusException::forbidden('Accès à ce patient refusé');
        }

        return $patientId;
    }

    /**
     * Vérifie l'accès à l'objet de la conversation et renvoie le patient concerné.
     */
    private function authorizeContext(array $user, string $contextType, string $contextId): ?string
    {
        if ($contextType === 'patient') {
            return $this->authorizedPatientId($user, $contextId);
        }

        if ($contextType === 'appointment') {
            $access = AppointmentDetailAccess::loadAccessContext($this->db, $contextId);
            if ($access === null) {
                throw HttpStatusException::notFound('Rendez-vous introuvable');
            }
            if (!AppointmentDetailAccess::userHasDetailAccess($this->db, $user, $access['row'], $access['id'], $access['has_creation_batch_column'])) {
                throw HttpStatusException::forbidden('Accès à ce rendez-vous refusé');
            }
            $relativeId = isset($access['row']['relative_id']) ? (string) $access['row']['relative_id'] : null;

            return MedicalDocumentAccess::subjectDossierId($this->db, (string) ($access['row']['patient_id'] ?? ''), $relativeId);
        }

        $stmt = $this->db->prepare('
            SELECT md.*, a.patient_id AS apt_patient_id, a.relative_id AS apt_relative_id, a.assigned_to, a.assigned_nurse_id, a.assigned_lab_id,
                   a.assigned_pro_id, a.created_by AS apt_created_by
            FROM medical_documents md
            LEFT JOIN appointments a ON md.appointment_id = a.id
            WHERE md.id = ?
            LIMIT 1
        ');
        $stmt->execute([$contextId]);
        $document = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$document || ($document['document_type'] ?? '') !== 'resultats') {
            throw HttpStatusException::notFound('Résultat introuvable');
        }
        if (!MedicalDocumentAccess::userCanAccess($this->db, $user, $document)) {
            throw HttpStatusException::forbidden('Accès à ce résultat refusé');
        }
        if (!empty($document['apt_patient_id'])) {
            $relativeId = isset($document['apt_relative_id']) ? (string) $document['apt_relative_id'] : null;

            return MedicalDocumentAccess::subjectDossierId($this->db, (string) $document['apt_patient_id'], $relativeId);
        }
        $patientId = (string) ($document['patient_id'] ?? '');

        return $patientId !== '' ? $patientId : null;
    }

    /**
     * @param array<string, mixed> $patch
     */
    public function update(string $id, string $userId, array $patch): ?array
    {
        $existing = $this->getById($id, $userId);
        if (!$existing) {
            return null;
        }
        $fields = [];
        $params = [];
        if (array_key_exists('custom_title', $patch)) {
            $title = trim((string) $patch['custom_title']);
            if (mb_strlen($title) > self::MAX_TITLE_LENGTH) {
                throw new InvalidArgumentException('Titre trop long (' . self::MAX_TITLE_LENGTH . ' caractères maximum)');
            }
            $fields[] = 'custom_title = ?';
            $params[] = $title;
        }
        if (array_key_exists('is_pinned', $patch)) {
            $fields[] = 'is_pinned = ?';
            $params[] = !empty($patch['is_pinned']) ? 1 : 0;
        }
        if (array_key_exists('archived', $patch)) {
            $fields[] = 'archived_at = ?';
            $params[] = !empty($patch['archived']) ? date('Y-m-d H:i:s') : null;
        }
        if ($fields === []) {
            return $existing;
        }
        $params[] = $id;
        $params[] = $userId;
        $sql = 'UPDATE ai_conversations SET ' . implode(', ', $fields) . ' WHERE id = ? AND user_id = ?';
        $this->db->prepare($sql)->execute($params);

        return $this->getById($id, $userId);
    }

    /**
     * Suppression définitive par le propriétaire. Les messages, sources, résumés et liens de pièces jointes
     * partent en cascade ; les sessions vocales (transcriptions) et les brouillons non confirmés sont supprimés.
     * Restent : les fichiers des documents médicaux (dossier patient), les brouillons confirmés (trace du RDV créé),
     * les audits techniques sans contenu et la note de feedback sans son commentaire.
     *
     * @return array{messages: int, voice_sessions: int, drafts: int}
     */
    public function deletePermanently(array $user, string $id): array
    {
        $userId = (string) ($user['user_id'] ?? '');
        if (!Validation::uuid($id)) {
            throw new InvalidArgumentException('Identifiant de conversation invalide');
        }

        $counts = DatabaseTransaction::run($this->db, function () use ($id, $userId): array {
            $stmt = $this->db->prepare('
                SELECT is_system, message_count FROM ai_conversations WHERE id = ? AND user_id = ? FOR UPDATE
            ');
            $stmt->execute([$id, $userId]);
            $conv = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$conv) {
                throw HttpStatusException::notFound('Conversation introuvable');
            }
            if ((int) $conv['is_system'] === 1) {
                throw new HttpStatusException('Cette conversation ne peut pas être supprimée.', 409, 'AI_CONVERSATION_SYSTEM');
            }

            $drafts = $this->db->prepare("DELETE FROM ai_appointment_drafts WHERE conversation_id = ? AND status <> 'confirmed'");
            $drafts->execute([$id]);
            $voice = $this->db->prepare('DELETE FROM voice_sessions WHERE ai_conversation_id = ? AND user_id = ?');
            $voice->execute([$id, $userId]);
            $this->db->prepare('UPDATE ai_feedback SET comment = NULL WHERE conversation_id = ?')->execute([$id]);
            $this->db->prepare('DELETE FROM ai_conversations WHERE id = ? AND user_id = ?')->execute([$id, $userId]);

            return ['messages' => (int) $conv['message_count'], 'voice_sessions' => $voice->rowCount(), 'drafts' => $drafts->rowCount()];
        });

        (new Logger($this->db))->log($userId, (string) ($user['role'] ?? ''), 'ai_conversation_deleted', 'ai_conversation', $id, $counts);

        return $counts;
    }

    public function countUserMessages(string $conversationId): int
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM ai_messages WHERE conversation_id = ? AND role = ?');
        $stmt->execute([$conversationId, 'user']);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Titre auto (premier message utilisateur), style ChatGPT.
     *
     * @param array<string, mixed> $conv
     */
    public function maybeAutoTitle(string $id, string $userId, string $userMessage, array $conv): ?array
    {
        if (!empty($conv['is_system'])) {
            return null;
        }
        $existing = trim((string) ($conv['custom_title'] ?? ''));
        if ($existing !== '') {
            return null;
        }
        if ($this->countUserMessages($id) !== 1) {
            return null;
        }

        $title = self::fallbackTitleFromMessage($userMessage);
        if ($title === '' || $title === 'Nouvelle conversation') {
            return null;
        }

        return $this->update($id, $userId, ['custom_title' => $title]);
    }

    public static function fallbackTitleFromMessage(string $message): string
    {
        $clean = preg_replace('/\s+/u', ' ', trim($message)) ?? '';
        if ($clean === '') {
            return 'Nouvelle conversation';
        }
        $clean = rtrim($clean, '.!?…');
        if (mb_strlen($clean) <= 48) {
            return mb_strtoupper(mb_substr($clean, 0, 1)) . mb_substr($clean, 1);
        }
        $trunc = mb_substr($clean, 0, 48);
        $lastSpace = mb_strrpos($trunc, ' ');
        if ($lastSpace !== false && $lastSpace > 16) {
            $trunc = mb_substr($trunc, 0, $lastSpace);
        }

        return mb_strtoupper(mb_substr($trunc, 0, 1)) . mb_substr($trunc, 1) . '…';
    }

    /**
     * @return array<string, mixed>
     */
    public function ensureSystem(array $user, string $systemKey): array
    {
        if (!isset(self::SYSTEM_CONVERSATIONS[$systemKey])) {
            throw new InvalidArgumentException('system_key invalide');
        }
        $userId = (string) $user['user_id'];
        $find = $this->db->prepare('
            SELECT * FROM ai_conversations
            WHERE user_id = ? AND is_system = 1 AND system_key = ? AND deleted_at IS NULL
            LIMIT 1
        ');
        $find->execute([$userId, $systemKey]);
        $row = $find->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return $this->mapConversation($row);
        }

        // Une clé unique exigerait de dédoublonner l'existant : un verrou nommé sérialise les créations concurrentes.
        // Le message d'accueil lit le profil sur une autre connexion : il est calculé hors verrou et hors transaction.
        $welcome = $this->welcomeMessage($user, $systemKey);
        $lockName = 'ai_system_conversation:' . sha1($userId . ':' . $systemKey);
        $lock = $this->db->prepare('SELECT GET_LOCK(?, 10)');
        $lock->execute([$lockName]);
        if ((int) $lock->fetchColumn() !== 1) {
            throw new HttpStatusException('Conversation en cours de création, réessayez.', 409, 'AI_CONVERSATION_BUSY');
        }
        try {
            $find->execute([$userId, $systemKey]);
            $existing = $find->fetch(PDO::FETCH_ASSOC);
            if ($existing) {
                return $this->mapConversation($existing);
            }
            $id = Uuid::v4();
            DatabaseTransaction::run($this->db, function () use ($id, $userId, $systemKey, $welcome): void {
                $this->db->prepare('
                    INSERT INTO ai_conversations
                        (id, user_id, conversation_type, custom_title, is_system, system_key)
                    VALUES (?, ?, ?, ?, 1, ?)
                ')->execute([$id, $userId, $systemKey, self::SYSTEM_CONVERSATIONS[$systemKey], $systemKey]);
                $this->addMessage($id, 'assistant', $welcome);
            });
        } finally {
            $this->db->prepare('SELECT RELEASE_LOCK(?)')->execute([$lockName]);
        }

        return $this->getById($id, $userId) ?? [];
    }

    /**
     * @param array<string, mixed>|null $metadata
     */
    public function addMessage(
        string $conversationId,
        string $role,
        string $content,
        ?array $metadata = null,
        ?string $clientMessageId = null,
        ?string $replyToMessageId = null,
    ): array {
        $id = Uuid::v4();
        $metaJson = $metadata !== null ? json_encode($metadata, JSON_UNESCAPED_UNICODE) : null;
        $this->db->prepare('
            INSERT INTO ai_messages (id, conversation_id, client_message_id, reply_to_message_id, role, content, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ')->execute([$id, $conversationId, $clientMessageId, $replyToMessageId, $role, $content, $metaJson]);

        $this->db->prepare('
            UPDATE ai_conversations
            SET last_message_at = NOW(), message_count = message_count + 1, updated_at = NOW()
            WHERE id = ?
        ')->execute([$conversationId]);

        return $this->getMessageById($id, $conversationId) ?? [];
    }

    public function getMessageById(string $messageId, string $conversationId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM ai_messages WHERE id = ? AND conversation_id = ? LIMIT 1');
        $stmt->execute([$messageId, $conversationId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? $this->mapMessage($row) : null;
    }

    /**
     * Message utilisateur déjà reçu pour ce client_message_id, avec son âge en secondes.
     *
     * @return array{message: array<string, mixed>, age_seconds: int}|null
     */
    public function findByClientMessageId(string $conversationId, string $clientMessageId): ?array
    {
        $stmt = $this->db->prepare('
            SELECT m.*, TIMESTAMPDIFF(SECOND, m.created_at, NOW()) AS age_seconds
            FROM ai_messages m
            WHERE m.conversation_id = ? AND m.client_message_id = ?
            LIMIT 1
        ');
        $stmt->execute([$conversationId, $clientMessageId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }

        return ['message' => $this->mapMessage($row), 'age_seconds' => (int) $row['age_seconds']];
    }

    public function findReplyTo(string $conversationId, string $userMessageId): ?array
    {
        $stmt = $this->db->prepare('
            SELECT * FROM ai_messages
            WHERE conversation_id = ? AND reply_to_message_id = ? AND role = \'assistant\'
            ORDER BY seq DESC
            LIMIT 1
        ');
        $stmt->execute([$conversationId, $userMessageId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? $this->mapMessage($row) : null;
    }

    /**
     * Réponse à régénérer : elle doit être le dernier message de la conversation et répondre à une question.
     * La question est renvoyée brute (contenu tel qu'envoyé au modèle).
     *
     * @return array{answer: array<string, mixed>, question: array{id: string, content: string}}
     */
    public function regenerationTarget(string $conversationId, string $answerId): array
    {
        $stmt = $this->db->prepare('SELECT * FROM ai_messages WHERE id = ? AND conversation_id = ? LIMIT 1');
        $stmt->execute([$answerId, $conversationId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || $row['role'] !== 'assistant') {
            throw HttpStatusException::notFound('Réponse introuvable dans cette conversation');
        }
        if ($this->lastMessageId($conversationId) !== $answerId) {
            throw new HttpStatusException('Seule la dernière réponse peut être régénérée.', 409, 'AI_REGENERATE_NOT_LAST');
        }
        $question = null;
        if (!empty($row['reply_to_message_id'])) {
            $stmt = $this->db->prepare("SELECT id, content FROM ai_messages WHERE id = ? AND conversation_id = ? AND role = 'user' LIMIT 1");
            $stmt->execute([(string) $row['reply_to_message_id'], $conversationId]);
            $question = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        }
        if ($question === null) {
            throw new HttpStatusException('Cette réponse ne peut pas être régénérée.', 409, 'AI_REGENERATE_NOT_ALLOWED');
        }

        return ['answer' => $this->mapMessage($row), 'question' => ['id' => (string) $question['id'], 'content' => (string) $question['content']]];
    }

    /**
     * Remplace la dernière réponse par sa régénération, si elle est toujours la dernière (conversation verrouillée).
     *
     * @param array<string, mixed> $metadata
     * @return array<string, mixed>
     */
    public function replaceLastAnswer(
        string $conversationId,
        string $previousAnswerId,
        string $content,
        array $metadata,
        ?string $clientMessageId,
        string $questionId,
    ): array {
        return DatabaseTransaction::run($this->db, function () use ($conversationId, $previousAnswerId, $content, $metadata, $clientMessageId, $questionId): array {
            $this->db->prepare('SELECT id FROM ai_conversations WHERE id = ? FOR UPDATE')->execute([$conversationId]);
            if ($this->lastMessageId($conversationId) !== $previousAnswerId) {
                throw new HttpStatusException('Seule la dernière réponse peut être régénérée.', 409, 'AI_REGENERATE_NOT_LAST');
            }
            $this->removeMessage($conversationId, $previousAnswerId);

            return $this->addMessage($conversationId, 'assistant', $content, $metadata, $clientMessageId, $questionId);
        });
    }

    private function lastMessageId(string $conversationId): ?string
    {
        $stmt = $this->db->prepare('SELECT id FROM ai_messages WHERE conversation_id = ? ORDER BY created_at DESC, seq DESC LIMIT 1');
        $stmt->execute([$conversationId]);
        $id = $stmt->fetchColumn();

        return $id === false ? null : (string) $id;
    }

    /** Retire un message : question restée sans réponse (tour échoué) ou réponse remplacée par sa régénération. */
    public function removeMessage(string $conversationId, string $messageId): void
    {
        $stmt = $this->db->prepare('DELETE FROM ai_messages WHERE id = ? AND conversation_id = ?');
        $stmt->execute([$messageId, $conversationId]);
        if ($stmt->rowCount() > 0) {
            $this->db->prepare('
                UPDATE ai_conversations SET message_count = GREATEST(message_count, 1) - 1 WHERE id = ?
            ')->execute([$conversationId]);
        }
    }

    private function welcomeMessage(array $user, string $type): string
    {
        $name = '';
        try {
            $profile = $this->userModel()->getById((string) $user['user_id'], (string) $user['user_id'], (string) $user['role'], 'mobile');
            $name = trim((string) ($profile['first_name'] ?? ''));
        } catch (Throwable $e) {
            error_log('AiConversationService welcome: prénom indisponible : ' . $e->getMessage());
        }
        $greeting = $name !== '' ? "Bonjour {$name}," : 'Bonjour,';

        return match ($type) {
            'lab_results' => "{$greeting} je peux vous aider à comprendre vos résultats d'analyses (sans interprétation médicale). Que souhaitez-vous savoir ?",
            'appointment' => "{$greeting} je peux vous aider à préparer ou planifier un rendez-vous. Souhaitez-vous prendre un RDV ?",
            'assistant_health' => "{$greeting} je suis votre assistant Cary. Posez-moi vos questions sur votre suivi, vos RDV ou vos documents.",
            'health_tracking' => "{$greeting} je peux vous présenter vos tendances santé synchronisées (activité, poids, fréquence cardiaque). Que voulez-vous explorer ?",
            default => "{$greeting} je suis Cary, votre assistant. Comment puis-je vous aider ?",
        };
    }

    private static function optionalString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $trimmed = trim((string) $value);

        return $trimmed === '' ? null : $trimmed;
    }

    private static function isDuplicateKey(PDOException $e): bool
    {
        return ($e->errorInfo[1] ?? null) === 1062;
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function mapConversation(array $row): array
    {
        return [
            'id' => (string) $row['id'],
            'user_id' => (string) $row['user_id'],
            'patient_id' => $row['patient_id'] ?? null,
            'conversation_type' => $row['conversation_type'],
            'context_type' => $row['context_type'] ?? null,
            'context_id' => $row['context_id'] ?? null,
            'channel' => $row['channel'] ?? 'text',
            'custom_title' => $row['custom_title'] ?? null,
            'is_pinned' => (bool) ($row['is_pinned'] ?? false),
            'archived_at' => $row['archived_at'] ?? null,
            'is_system' => (bool) ($row['is_system'] ?? false),
            'system_key' => $row['system_key'] ?? null,
            'message_count' => (int) ($row['message_count'] ?? 0),
            'last_message_at' => $row['last_message_at'] ?? null,
            'created_at' => $row['created_at'] ?? null,
            'updated_at' => $row['updated_at'] ?? null,
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function mapMessage(array $row): array
    {
        $meta = null;
        if (!empty($row['metadata_json'])) {
            $decoded = json_decode((string) $row['metadata_json'], true);
            $meta = is_array($decoded) ? $decoded : null;
        }
        $sources = is_array($meta['sources'] ?? null) ? array_values($meta['sources']) : [];

        return [
            'id' => (string) $row['id'],
            'conversation_id' => (string) $row['conversation_id'],
            'client_message_id' => $row['client_message_id'] ?? null,
            'role' => $row['role'],
            'content' => AiSourceResolver::stripMarkers((string) $row['content']),
            'sources' => $sources,
            'metadata' => $meta,
            'created_at' => $row['created_at'] ?? null,
        ];
    }
}

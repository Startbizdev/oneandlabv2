<?php

declare(strict_types=1);

require_once __DIR__ . '/PrivacyGateway.php';
require_once __DIR__ . '/AssistantDocumentReader.php';
require_once __DIR__ . '/AssistantResultsConsent.php';
require_once __DIR__ . '/NgapReference.php';
require_once __DIR__ . '/../Crypto.php';
require_once __DIR__ . '/../AppTimezone.php';
require_once __DIR__ . '/../PatientDossierAccess.php';
require_once __DIR__ . '/../RelativeProfile.php';
require_once __DIR__ . '/../appointments/AppointmentDetailAccess.php';
require_once __DIR__ . '/../../models/User.php';

/**
 * Outils en lecture seule exécutés côté serveur. Chaque résultat est minimisé (jamais d'adresse, de téléphone,
 * d'e-mail) puis passé à la barrière ; les noms deviennent des alias. propose_action n'écrit rien : il émet une carte.
 */
final class AssistantTools
{
    public const ACTION_PARAMS = [
        'book_appointment' => ['care_type', 'category_id', 'date', 'time_from', 'time_to', 'patient_id'],
        'open_appointment' => ['id'],
        'open_lab_results' => [],
        'open_health_record' => [],
        'open_tour' => ['date'],
        'create_transmission' => ['patient_id', 'appointment_id', 'body'],
        'call_emergency' => ['number'],
        'enable_results_reading' => [],
    ];

    public const STATUS = [
        'get_my_appointments' => 'Je consulte vos rendez-vous…',
        'get_appointment' => 'Je consulte ce rendez-vous…',
        'get_lab_results' => 'Je consulte les résultats…',
        'get_patient_summary' => 'Je consulte le dossier du patient…',
        'get_tour' => 'Je consulte la tournée…',
        'list_care_categories' => 'Je consulte les soins proposés…',
        'search_ngap' => 'Je consulte la NGAP…',
    ];

    private const TERMINAL = ['completed', 'canceled', 'cancelled', 'refused', 'expired'];
    /** Libellés affichés dans l'app : le modèle les reprend tels quels. */
    private const STATUS_LABELS = [
        'pending' => 'En attente', 'confirmed' => 'Confirmé', 'planned' => 'Planifié', 'inProgress' => 'En cours',
        'in_progress' => 'En cours', 'completed' => 'Terminé', 'canceled' => 'Annulé', 'cancelled' => 'Annulé',
        'refused' => 'Refusé', 'expired' => 'Expiré', 'done' => 'Terminé', 'en_route' => 'En route', 'todo' => 'À faire',
    ];
    private const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    private const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    private const TOUR_ROLES = ['nurse', 'preleveur'];

    private Crypto $crypto;

    /** @param callable(array{type: string, label: string, params: array<string, string>}): void $onAction */
    public function __construct(
        private readonly PDO $db,
        private readonly array $user,
        private readonly ?string $patientId,
        private readonly PrivacyGateway $gateway,
        private $onAction,
    ) {
        $this->crypto = new Crypto();
    }

    /** @return list<array<string, mixed>> définitions au format Chat Completions, filtrées par rôle */
    public static function definitions(string $role): array
    {
        $staff = $role !== 'patient';
        $tools = [
            self::define('get_my_appointments', 'Rendez-vous de l\'utilisateur (à venir par défaut, ou passés). Chaque élément fournit jour, créneau, soin et statut à reprendre tels quels.', ['period' => ['type' => 'string', 'enum' => ['upcoming', 'past']]]),
            self::define('get_appointment', 'Détail d\'un rendez-vous par son id.', ['id' => ['type' => 'string']], ['id']),
            self::define('get_lab_results', $staff ? 'Résultats d\'analyses du patient sélectionné.' : 'Résultats d\'analyses de l\'utilisateur.', ['limit' => ['type' => 'integer'], 'patient_id' => ['type' => 'string']]),
        ];
        if ($staff) {
            $tools[] = self::define('get_patient_summary', 'Synthèse d\'un patient suivi : âge, soins, derniers rendez-vous, transmissions.', ['patient_id' => ['type' => 'string']], ['patient_id']);
        }
        if (in_array($role, self::TOUR_ROLES, true)) {
            $tools[] = self::define('get_tour', 'Arrêts de la tournée d\'un jour (AAAA-MM-JJ, défaut aujourd\'hui).', ['date' => ['type' => 'string']]);
        }
        if ($role === 'patient') {
            $tools[] = self::define('list_care_categories', 'Soins réservables dans Cary (id, nom, type) : pour retrouver le category_id du soin demandé.', []);
        }
        if (in_array($role, ['nurse', 'pro'], true) && NgapReference::available()) {
            $tools[] = self::define('search_ngap', 'Recherche dans la NGAP officielle (Assurance Maladie) : passages à citer pour toute question de cotation. query : actes, lettres clés, majorations, situation.', ['query' => ['type' => 'string']], ['query']);
        }
        $tools[] = self::define('propose_action', 'Affiche un bouton sous ta réponse (libellé court, sans nom). N\'en parle pas dans ton texte : l\'app l\'affiche d\'elle-même.', [
            'type' => ['type' => 'string', 'enum' => array_keys(self::ACTION_PARAMS)],
            'label' => ['type' => 'string'],
            'params' => ['type' => 'object', 'description' => 'book_appointment : category_id (list_care_categories), care_type (blood_test = prise de sang, nursing = soin infirmier), date AAAA-MM-JJ, time_from et time_to (heures entières, plage de 2 h au moins) ; open_appointment : id ; open_tour : date ; create_transmission : patient_id, body.'],
        ], ['type', 'label']);

        return $tools;
    }

    /**
     * Enregistre dans la barrière les noms connus du tour : l'utilisateur, le dossier sélectionné et, pour un patient,
     * ses proches. Retourne l'alias du dossier sélectionné.
     */
    public function registerKnownNames(): ?string
    {
        $role = (string) $this->user['role'];
        $userId = (string) $this->user['user_id'];
        $this->gateway->alias($this->profileName($userId), $role === 'patient' ? 'Patient' : 'Soignant');
        if ($role === 'patient') {
            $stmt = $this->db->prepare('SELECT first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek FROM patient_relatives WHERE patient_id = ? LIMIT 20');
            $stmt->execute([$userId]);
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $relative) {
                $this->gateway->alias($this->name($relative), 'Proche');
            }
        }

        return $this->patientId !== null ? $this->gateway->alias($this->profileName($this->patientId), $role === 'patient' && $this->patientId !== $userId ? 'Proche' : 'Patient') : null;
    }

    /** @return array<string, mixed> résultat masqué renvoyé au modèle */
    public function execute(string $name, array $args): array
    {
        try {
            $result = match ($name) {
                'get_my_appointments' => $this->myAppointments(($args['period'] ?? '') === 'past'),
                'get_appointment' => $this->appointment((string) ($args['id'] ?? '')),
                'get_lab_results' => $this->labResults((string) ($args['patient_id'] ?? ''), (int) ($args['limit'] ?? 5)),
                'get_patient_summary' => $this->patientSummary((string) ($args['patient_id'] ?? '')),
                'get_tour' => $this->tour((string) ($args['date'] ?? '')),
                'list_care_categories' => $this->careCategories(),
                'search_ngap' => $this->ngap((string) ($args['query'] ?? '')),
                'propose_action' => $this->proposeAction($args),
                default => ['error' => 'UNKNOWN_TOOL'],
            };
        } catch (HttpStatusException $e) {
            $result = ['error' => $e->errorCode];
        }

        return (array) $this->gateway->maskData($result);
    }

    private function myAppointments(bool $past): array
    {
        $role = (string) $this->user['role'];
        $userId = (string) $this->user['user_id'];
        if ($role === 'patient') {
            [$where, $params] = $this->patientId !== null && $this->patientId !== $userId
                ? RelativeProfile::appointmentSubjectSql($this->db, 'a', $this->patientId)
                : ['a.patient_id = ?', [$userId]];
        } else {
            [$where, $params] = ['(a.assigned_nurse_id = ? OR a.created_by = ? OR a.assigned_to = ?)', [$userId, $userId, $userId]];
        }
        $terminal = implode(',', array_fill(0, count(self::TERMINAL), '?'));
        $window = $past
            ? "(a.status IN ($terminal) OR a.scheduled_at < ?) ORDER BY a.scheduled_at DESC"
            : "a.status NOT IN ($terminal) AND (a.scheduled_at IS NULL OR a.scheduled_at >= ?) ORDER BY a.scheduled_at ASC";
        $rows = $this->appointmentRows("$where AND $window LIMIT 10", [...$params, ...self::TERMINAL, AppTimezone::sqlStartOfToday()]);

        return ['period' => $past ? 'past' : 'upcoming', 'items' => array_map([$this, 'mapAppointment'], $rows)];
    }

    private function appointment(string $id): array
    {
        $access = $id !== '' ? AppointmentDetailAccess::loadAccessContext($this->db, $id) : null;
        if ($access === null) {
            return ['error' => 'NOT_FOUND'];
        }
        if (!AppointmentDetailAccess::userHasDetailAccess($this->db, $this->user, $access['row'], $access['id'], $access['has_creation_batch_column'])) {
            return ['error' => 'FORBIDDEN'];
        }
        $rows = $this->appointmentRows('a.id = ?', [$access['id']]);
        $item = $rows !== [] ? $this->mapAppointment($rows[0]) : ['error' => 'NOT_FOUND'];
        $items = $this->db->prepare('SELECT label FROM appointment_nursing_items WHERE appointment_id = ? ORDER BY sort_order LIMIT 10');
        $items->execute([$access['id']]);
        $item['actes'] = array_values(array_filter(array_map('strval', $items->fetchAll(PDO::FETCH_COLUMN))));

        return $item;
    }

    private function labResults(string $patientId, int $limit): array
    {
        $subject = $this->subject($patientId);
        [$where, $params] = RelativeProfile::appointmentSubjectSql($this->db, 'a', $subject);
        $stmt = $this->db->prepare("
            SELECT md.id, md.created_at, a.id AS appointment_id, a.scheduled_at, cc.name AS category_name
            FROM medical_documents md
            INNER JOIN appointments a ON a.id = md.appointment_id
            LEFT JOIN care_categories cc ON cc.id = a.category_id
            WHERE $where AND md.document_type = 'resultats' AND md.replaced_by_document_id IS NULL
            ORDER BY md.created_at DESC LIMIT " . max(1, min(10, $limit)));
        $stmt->execute($params);

        $items = array_map(static fn (array $r): array => [
            'id' => (string) $r['id'],
            'date' => substr((string) $r['created_at'], 0, 10),
            'jour' => self::dayLabel($r['created_at']),
            'analyse' => $r['category_name'] ?? 'Bilan sanguin',
            'appointment_id' => (string) $r['appointment_id'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
        $result = ['items' => $items, 'note' => 'Les valeurs détaillées ne sont lisibles que si l\'utilisateur joint le document à la conversation.'];
        $userId = (string) $this->user['user_id'];
        if ((string) $this->user['role'] !== 'patient' || $subject !== $userId || $items === []) {
            return $result;
        }
        if (!AssistantResultsConsent::has($this->db, $userId)) {
            // Lecture automatique non autorisée : le patient peut l'activer d'un geste (bouton sous la réponse).
            ($this->onAction)(['type' => 'enable_results_reading', 'label' => 'Autoriser la lecture de mes résultats', 'params' => []]);
            $result['note'] = 'Lecture automatique non autorisée : dites en une phrase que le patient peut l\'autoriser juste en dessous, ou joindre le document.';

            return $result;
        }
        try {
            $document = AssistantDocumentReader::read($this->db, $this->user, $items[0]['id']);
        } catch (AssistantError) {
            $result['note'] = 'Le dernier compte rendu n\'a pas pu être lu : le patient peut le joindre à la conversation.';

            return $result;
        }
        if ($document['kind'] === 'text' && trim($document['text']) !== '') {
            $result['dernier_compte_rendu'] = $document['text'];
            $result['note'] = 'Compte rendu le plus récent, lu avec l\'accord du patient.';
        } else {
            $result['note'] = 'Le dernier compte rendu est une image : le patient doit la joindre à la conversation pour qu\'elle soit lue.';
        }

        return $result;
    }

    /** Soins réservables par un patient (le certificat de décès reste réservé aux soignants). */
    private function careCategories(): array
    {
        $rows = $this->db->query('SELECT id, name, type FROM care_categories WHERE is_active = 1 ORDER BY type, name')->fetchAll(PDO::FETCH_ASSOC);
        $items = [];
        foreach ($rows as $row) {
            if (preg_match('/certificat\s+(de\s+)?d[ée]c[èe]s/iu', (string) $row['name']) !== 1) {
                $items[] = ['category_id' => (string) $row['id'], 'soin' => (string) $row['name'], 'type' => (string) $row['type']];
            }
        }

        return ['items' => $items];
    }

    private function ngap(string $query): array
    {
        $passages = NgapReference::search($query);

        return [
            'source' => 'NGAP, Assurance Maladie',
            'version' => NgapReference::version(),
            'passages' => $passages,
            'note' => $passages === [] ? 'Aucun passage trouvé : dites que la NGAP chargée ne couvre pas ce cas.' : 'Répondez uniquement d\'après ces passages et citez-les.',
        ];
    }

    private function patientSummary(string $patientId): array
    {
        if ((string) $this->user['role'] === 'patient') {
            return ['error' => 'FORBIDDEN'];
        }
        $subject = $this->subject($patientId);
        $profile = $this->db->prepare('SELECT first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek, birth_date_encrypted, birth_date_dek, gender_encrypted, gender_dek FROM profiles WHERE id = ?');
        $profile->execute([$subject]);
        $row = $profile->fetch(PDO::FETCH_ASSOC) ?: [];
        $birth = !empty($row['birth_date_encrypted']) ? $this->crypto->decryptField((string) $row['birth_date_encrypted'], (string) $row['birth_date_dek']) : null;
        [$where, $params] = RelativeProfile::appointmentSubjectSql($this->db, 'a', $subject);
        $terminal = implode(',', array_fill(0, count(self::TERMINAL), '?'));
        $upcoming = $this->appointmentRows("$where AND a.status NOT IN ($terminal) ORDER BY a.scheduled_at ASC LIMIT 5", [...$params, ...self::TERMINAL]);
        $recent = $this->appointmentRows("$where AND a.status = 'completed' ORDER BY a.scheduled_at DESC LIMIT 5", $params);
        $summary = [
            'patient_id' => $subject,
            'patient' => $this->gateway->alias($this->name($row), 'Patient'),
            'age' => PrivacyGateway::ageFromBirthDate($birth),
            'sexe' => $this->decrypt($row, 'gender'),
            'soins_en_cours' => array_values(array_unique(array_filter(array_column($upcoming, 'category_name')))),
            'prochains_rdv' => array_map([$this, 'mapAppointment'], $upcoming),
            'derniers_rdv' => array_map([$this, 'mapAppointment'], $recent),
            'transmissions' => [],
        ];
        if (in_array((string) $this->user['role'], ['nurse', 'pro'], true)) {
            require_once __DIR__ . '/../health/PatientTransmissionService.php';
            $feed = (new PatientTransmissionService(static fn (): null => null, $this->db))->list($this->user, $subject, null, 7);
            foreach (array_slice($feed['items'], 0, 5) as $t) {
                $summary['transmissions'][] = ['date' => $t['occurred_on'], 'texte' => mb_substr((string) $t['body'], 0, 500)];
            }
        }

        return $summary;
    }

    private function tour(string $date): array
    {
        $role = (string) $this->user['role'];
        if (!in_array($role, self::TOUR_ROLES, true)) {
            return ['error' => 'FORBIDDEN'];
        }
        $day = AppTimezone::parseDateYmd($date)?->format('Y-m-d') ?? AppTimezone::now()->format('Y-m-d');
        if ($role === 'nurse') {
            require_once __DIR__ . '/../nurse-tour/NurseTourService.php';
            $tour = (new NurseTourService($this->db))->getTour((string) $this->user['user_id'], $day);
        } else {
            require_once __DIR__ . '/../preleveur-tour/PreleveurTourService.php';
            $tour = (new PreleveurTourService($this->db))->getTour((string) $this->user['user_id'], $day);
        }
        $stops = [];
        foreach ($tour['stops'] ?? [] as $stop) {
            $stops[] = [
                'appointment_id' => (string) $stop['appointment_id'],
                'ordre' => $stop['position'] ?? null,
                'patient' => $this->gateway->alias((string) ($stop['patient_name'] ?? ''), 'Patient'),
                'creneau' => self::time($stop['scheduled_at'] ?? null),
                'soin' => $stop['category_name'] ?? null,
                'statut' => self::statusLabel(($stop['visit_status'] ?? 'todo') !== 'todo' ? $stop['visit_status'] : ($stop['status'] ?? null)),
            ];
        }

        return ['date' => $day, 'jour' => self::dayLabel($day), 'items' => $stops];
    }

    private function proposeAction(array $args): array
    {
        $type = (string) ($args['type'] ?? '');
        if (!isset(self::ACTION_PARAMS[$type])) {
            return ['error' => 'UNKNOWN_ACTION'];
        }
        $params = [];
        $raw = is_array($args['params'] ?? null) ? $args['params'] : [];
        foreach (self::ACTION_PARAMS[$type] as $key) {
            if (isset($raw[$key]) && is_scalar($raw[$key]) && trim((string) $raw[$key]) !== '') {
                $params[$key] = mb_substr(trim((string) $raw[$key]), 0, 2000);
            }
        }
        $label = mb_substr(trim((string) ($args['label'] ?? '')), 0, 80);
        ($this->onAction)(['type' => $type, 'label' => $label !== '' ? $label : 'Ouvrir', 'params' => $params]);

        return ['ok' => true, 'info' => 'Carte affichée à l\'utilisateur, qui la validera lui-même.'];
    }

    /** Dossier visé : celui demandé (accès vérifié), sinon le patient sélectionné, sinon l'utilisateur patient. */
    private function subject(string $patientId): string
    {
        $patientId = $patientId !== '' ? $patientId : (string) $this->patientId;
        if ($patientId === '' && (string) $this->user['role'] === 'patient') {
            return (string) $this->user['user_id'];
        }
        if ($patientId === '' || !PatientDossierAccess::canAccess($this->db, new User($this->db), $this->user, $patientId)) {
            throw HttpStatusException::forbidden('Accès au dossier refusé');
        }

        return $patientId;
    }

    /** @return list<array<string, mixed>> */
    private function appointmentRows(string $whereAndTail, array $params): array
    {
        $stmt = $this->db->prepare("
            SELECT a.id, a.type, a.status, a.scheduled_at, a.patient_id, cc.name AS category_name,
                   COALESCE(r.first_name_encrypted, p.first_name_encrypted) AS fn_enc, COALESCE(r.first_name_dek, p.first_name_dek) AS fn_dek,
                   COALESCE(r.last_name_encrypted, p.last_name_encrypted) AS ln_enc, COALESCE(r.last_name_dek, p.last_name_dek) AS ln_dek,
                   s.first_name_encrypted AS s_fn_enc, s.first_name_dek AS s_fn_dek, s.last_name_encrypted AS s_ln_enc, s.last_name_dek AS s_ln_dek
            FROM appointments a
            LEFT JOIN care_categories cc ON cc.id = a.category_id
            LEFT JOIN profiles p ON p.id = a.patient_id
            LEFT JOIN patient_relatives r ON r.id = a.relative_id
            LEFT JOIN profiles s ON s.id = COALESCE(a.assigned_nurse_id, a.assigned_to)
            WHERE $whereAndTail
        ");
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function mapAppointment(array $row): array
    {
        $item = [
            'id' => (string) $row['id'],
            'date' => $row['scheduled_at'] !== null ? substr((string) $row['scheduled_at'], 0, 10) : null,
            'jour' => self::dayLabel($row['scheduled_at']),
            'creneau' => self::time($row['scheduled_at']),
            'soin' => $row['category_name'] ?? ($row['type'] === 'blood_test' ? 'Prise de sang' : 'Soin infirmier'),
            'statut' => self::statusLabel($row['status'] ?? null),
        ];
        if ((string) $this->user['role'] === 'patient') {
            $staff = $this->name(['first_name_encrypted' => $row['s_fn_enc'], 'first_name_dek' => $row['s_fn_dek'], 'last_name_encrypted' => $row['s_ln_enc'], 'last_name_dek' => $row['s_ln_dek']]);
            $item['intervenant'] = $staff !== '' ? $this->gateway->alias($staff, 'Soignant') : null;
        } else {
            $item['patient'] = $this->gateway->alias($this->name(['first_name_encrypted' => $row['fn_enc'], 'first_name_dek' => $row['fn_dek'], 'last_name_encrypted' => $row['ln_enc'], 'last_name_dek' => $row['ln_dek']]), 'Patient');
        }

        return $item;
    }

    /** Champ chiffré du profil (`<champ>_encrypted` + `<champ>_dek`), null si absent ou illisible. */
    private function decrypt(array $row, string $field): ?string
    {
        if (empty($row[$field . '_encrypted']) || empty($row[$field . '_dek'])) {
            return null;
        }
        try {
            return trim($this->crypto->decryptField((string) $row[$field . '_encrypted'], (string) $row[$field . '_dek'])) ?: null;
        } catch (Throwable) {
            return null;
        }
    }

    private function profileName(string $profileId): string
    {
        $stmt = $this->db->prepare('SELECT first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek FROM profiles WHERE id = ?');
        $stmt->execute([$profileId]);

        return $this->name($stmt->fetch(PDO::FETCH_ASSOC) ?: []);
    }

    private function name(array $row): string
    {
        $parts = [];
        foreach (['first_name', 'last_name'] as $field) {
            if (!empty($row[$field . '_encrypted']) && !empty($row[$field . '_dek'])) {
                try {
                    $parts[] = trim($this->crypto->decryptField((string) $row[$field . '_encrypted'], (string) $row[$field . '_dek']));
                } catch (Throwable) {
                }
            }
        }

        return trim(implode(' ', $parts));
    }

    /** « vendredi 23 octobre 2026 » : le jour de la semaine est fourni, jamais calculé par le modèle. */
    public static function dayLabel(mixed $sql): ?string
    {
        if (!is_string($sql) || preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $sql, $m) !== 1) {
            return null;
        }
        $ts = gmmktime(12, 0, 0, (int) $m[2], (int) $m[3], (int) $m[1]);

        return self::WEEKDAYS[(int) gmdate('w', $ts)] . ' ' . (int) $m[3] . ' ' . self::MONTHS[(int) $m[2] - 1] . ' ' . $m[1];
    }

    private static function statusLabel(mixed $status): ?string
    {
        return is_string($status) ? (self::STATUS_LABELS[$status] ?? $status) : null;
    }

    private static function time(mixed $sql): ?string
    {
        return is_string($sql) && strlen($sql) >= 16 && substr($sql, 11, 5) !== '00:00' ? substr($sql, 11, 5) : null;
    }

    /** @param array<string, array<string, mixed>> $properties */
    private static function define(string $name, string $description, array $properties, array $required = []): array
    {
        return ['type' => 'function', 'function' => [
            'name' => $name,
            'description' => $description,
            'parameters' => ['type' => 'object', 'properties' => (object) $properties, 'required' => $required],
        ]];
    }
}

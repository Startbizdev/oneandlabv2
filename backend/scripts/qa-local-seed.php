<?php

declare(strict_types=1);

/**
 * Jeu de démonstration pour la QA visuelle mobile, sur la stack locale docker-compose.e2e-live.yml
 * (MySQL jetable + API PHP sur 127.0.0.1:8888), après test-db-bootstrap.php et e2e-live-seed.php.
 *
 * Passe par les vrais endpoints de l'API locale (règles métier réelles). SQL direct uniquement pour
 * ce que l'API ne permet pas : création du compte pharmacie et du mot de passe de Bruno, et
 * déplacement de dates vers aujourd'hui / le passé (l'API refuse un RDV dans le passé).
 *
 * Usage (depuis la racine du repo) : npm run qa:seed:local [-- --reset | --report]
 *   (sans option)  seed si la base ne l'est pas encore, sinon affiche le rapport
 *   --reset        supprime les données métier des comptes de démo puis reseed (dates recalées sur aujourd'hui)
 *   --report       affiche uniquement le rapport (SQL)
 *   --verify       relit le jeu par l'API, compte par compte (7 connexions : limite 20 / 15 min par IP)
 *
 * Refuse toute base qui ne finit pas par "_test" et tout hôte DB / API non local.
 */

require_once __DIR__ . '/../lib/Crypto.php';
require_once __DIR__ . '/../tests/fixtures/TestFixtures.php';

const QA_ALLOWED_DB_HOSTS = ['localhost', '127.0.0.1', '::1', 'mysql-e2e'];
const QA_ALLOWED_API_HOSTS = ['localhost', '127.0.0.1', '::1', 'api-e2e'];
const QA_ALLOWED_SMTP_HOSTS = ['localhost', '127.0.0.1', '::1'];

const QA_PHARMACY = '00000000-0000-4000-8000-00000000d002';
const QA_PHARMACY_EMAIL = 'pharmacie@test.invalid';
const QA_LAB_B = '00000000-0000-4000-8000-00000000c101';

/** Patients créés par l'API au cours du seed (retrouvés par e-mail lors d'un --reset). */
const QA_CREATED_PATIENT_EMAILS = [
    'simone.leroy.qa@test.invalid',
    'claire.martin.qa@test.invalid',
    'marcel.durand.qa@test.invalid',
];

$env = static fn (string $k, string $d = ''): string => (string) (getenv($k) !== false ? getenv($k) : $d);

$dbHost = $env('DB_HOST', '127.0.0.1');
$dbName = $env('DB_NAME', 'oneandlab_test');
$apiBase = rtrim($env('QA_API_BASE', 'http://127.0.0.1:8888'), '/');
$password = $env('E2E_LIVE_PASSWORD');

if (!preg_match('/^[a-z0-9_]+_test$/', $dbName)) {
    fwrite(STDERR, "Refus : DB_NAME doit finir par _test (reçu: $dbName)\n");
    exit(1);
}
if (!in_array($dbHost, QA_ALLOWED_DB_HOSTS, true)) {
    fwrite(STDERR, "Refus : DB_HOST non local (reçu: $dbHost)\n");
    exit(1);
}
$apiHost = (string) parse_url($apiBase, PHP_URL_HOST);
if (!in_array($apiHost, QA_ALLOWED_API_HOSTS, true)) {
    fwrite(STDERR, "Refus : QA_API_BASE non local (reçu: $apiBase)\n");
    exit(1);
}
// Chaque changement de statut fait envoyer un e-mail par l'API : sans SMTP_HOST local, Email.php vise ssl0.ovh.net.
$smtpHost = getenv('SMTP_HOST') ?: 'ssl0.ovh.net';
$repoEnv = __DIR__ . '/../../.env';
if (is_readable($repoEnv) && preg_match('/^\s*SMTP_HOST\s*=\s*"?([^"\s#]+)/m', (string) file_get_contents($repoEnv), $m)) {
    $smtpHost = $m[1];
}
if (!in_array('--report', $argv, true) && !in_array($smtpHost, QA_ALLOWED_SMTP_HOSTS, true)) {
    fwrite(STDERR, "Refus : l'API enverrait ses e-mails vers un hôte distant (SMTP_HOST=$smtpHost). Définir SMTP_HOST local dans l'environnement de l'API.\n");
    exit(1);
}
if ($password === '') {
    fwrite(STDERR, "E2E_LIVE_PASSWORD manquant\n");
    exit(1);
}

$mode = match (true) {
    in_array('--reset', $argv, true) => 'reset',
    in_array('--report', $argv, true) => 'report',
    in_array('--verify', $argv, true) => 'verify',
    default => 'seed',
};

$pdo = new PDO(
    sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $dbHost, $env('DB_PORT', '3306'), $dbName),
    $env('DB_USER', 'root'),
    $env('DB_PASS', ''),
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
);

/** Client HTTP d'un compte : JWT Bearer + cookie de session pour le jeton CSRF. */
final class QaApiClient
{
    private string $token = '';
    private string $csrf = '';
    private string $cookieFile;

    public function __construct(private string $baseUrl, public readonly string $label)
    {
        $this->cookieFile = (string) tempnam(sys_get_temp_dir(), 'qa-seed-cookie-');
    }

    public function __destruct()
    {
        if (is_file($this->cookieFile)) {
            unlink($this->cookieFile);
        }
    }

    public function login(string $email, string $password): void
    {
        $res = $this->request('POST', '/api/auth/login', json_encode(['email' => $email, 'password' => $password]), ['Content-Type: application/json']);
        $token = $res['json']['token'] ?? null;
        if (!is_string($token) || $token === '') {
            throw new RuntimeException("[{$this->label}] login refusé ({$res['status']}) : " . ($res['json']['error'] ?? $res['raw']));
        }
        $this->token = $token;
        $csrf = $this->get('/api/auth/csrf-token');
        $this->csrf = (string) ($csrf['data']['csrf_token'] ?? '');
        if ($this->csrf === '') {
            throw new RuntimeException("[{$this->label}] jeton CSRF introuvable");
        }
    }

    /** @return array<string, mixed> */
    public function get(string $path): array
    {
        return self::expectOk($this->request('GET', $path, null, []), "GET $path", $this->label);
    }

    /** @return array{status: int, json: array<string, mixed>, raw: string} */
    public function tryGet(string $path): array
    {
        return $this->request('GET', $path, null, []);
    }

    /**
     * @param array<string, mixed> $body
     * @return array<string, mixed>
     */
    public function send(string $method, string $path, array $body): array
    {
        $res = $this->request($method, $path, json_encode($body, JSON_UNESCAPED_UNICODE), ['Content-Type: application/json']);

        return self::expectOk($res, "$method $path", $this->label);
    }

    /**
     * @param array<string, string> $fields
     * @return array<string, mixed>
     */
    public function upload(string $path, array $fields, string $fileName, string $mime, string $content): array
    {
        $tmp = (string) tempnam(sys_get_temp_dir(), 'qa-seed-file-');
        file_put_contents($tmp, $content);
        try {
            $fields['file'] = new CURLFile($tmp, $mime, $fileName);
            $res = $this->request('POST', $path, $fields, []);
        } finally {
            unlink($tmp);
        }

        return self::expectOk($res, "POST $path (upload)", $this->label);
    }

    /**
     * @param string|array<string, mixed>|null $body
     * @param list<string> $headers
     * @return array{status: int, json: array<string, mixed>, raw: string}
     */
    private function request(string $method, string $path, string|array|null $body, array $headers): array
    {
        $ch = curl_init($this->baseUrl . $path);
        if ($this->token !== '') {
            $headers[] = 'Authorization: Bearer ' . $this->token;
        }
        if ($this->csrf !== '') {
            $headers[] = 'X-CSRF-Token: ' . $this->csrf;
        }
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_COOKIEJAR => $this->cookieFile,
            CURLOPT_COOKIEFILE => $this->cookieFile,
            CURLOPT_TIMEOUT => 60,
        ]);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }
        $raw = curl_exec($ch);
        if ($raw === false) {
            $error = curl_error($ch);
            throw new RuntimeException("[{$this->label}] $method $path : API injoignable ($error)");
        }
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $json = json_decode((string) $raw, true);

        return ['status' => $status, 'json' => is_array($json) ? $json : [], 'raw' => substr((string) $raw, 0, 500)];
    }

    /**
     * @param array{status: int, json: array<string, mixed>, raw: string} $res
     * @return array<string, mixed>
     */
    private static function expectOk(array $res, string $context, string $label): array
    {
        if ($res['status'] >= 400 || ($res['json']['success'] ?? null) !== true) {
            throw new RuntimeException("[$label] $context → HTTP {$res['status']} : " . ($res['json']['error'] ?? $res['raw']));
        }

        return $res['json'];
    }
}

final class QaSeed
{
    private DateTimeImmutable $today;
    private int $stagingSlot = 0;
    /** @var array<string, QaApiClient> */
    private array $clients = [];
    /** @var array<string, string> */
    private array $categories = [];
    /** @var array<string, array<string, mixed>> */
    private array $manifest = [];

    public function __construct(private PDO $pdo, private string $apiBase, private string $password)
    {
        $this->today = new DateTimeImmutable('today', new DateTimeZone('Europe/Paris'));
    }

    public function isSeeded(): bool
    {
        $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM patient_relatives WHERE patient_id = ?');
        $stmt->execute([TestFixtures::PATIENT_A]);

        return (int) $stmt->fetchColumn() > 0;
    }

    public function run(): void
    {
        $this->prepareAccounts();
        $this->loadCategories();
        $this->loginAll();
        $this->completeProfiles();

        $relatives = $this->seedRelatives();
        $this->linkPatients();
        $staffPatients = $this->seedStaffPatients();

        $this->seedNurseFlows($relatives);
        $this->seedLabFlows($relatives);
        $this->seedProFlows();
        $this->seedNurseOwnPlanning($staffPatients['simone']);
        $this->seedPreleveurMissions($staffPatients);
        $this->seedPharmacyOrders($staffPatients['simone']);

        $this->printManifest();
        $this->verify();
    }

    /** Relit le jeu par les endpoints de liste utilisés par l'app, compte par compte. */
    public function verify(): void
    {
        if ($this->clients === []) {
            $this->loginAll();
        }
        $today = $this->today->format('Y-m-d');
        $checks = [
            'alice' => [
                '/api/appointments', '/api/patient-relatives', '/api/medical-documents', '/api/pharmacy-orders?scope=patient',
                '/api/reviews?patient_id=' . TestFixtures::PATIENT_A, '/api/notifications?limit=100',
            ],
            'bruno' => ['/api/appointments', '/api/reviews?patient_id=' . TestFixtures::PATIENT_B, '/api/notifications?limit=100'],
            'nina' => [
                '/api/appointments?nurse_segment=en_attente', '/api/appointments?nurse_segment=acceptes',
                '/api/appointments?nurse_segment=historique', "/api/nurse/tour?date=$today", '/api/patients',
                '/api/reviews?reviewee_id=' . TestFixtures::NURSE, '/api/nurse/prescriptions', '/api/pharmacy-orders?scope=sent',
                '/api/notifications?limit=100',
            ],
            'pro' => ['/api/appointments', '/api/patients', '/api/pro/prescriptions', '/api/pharmacy-orders?scope=sent', '/api/notifications?limit=100'],
            'preleveur' => ['/api/appointments', "/api/preleveur/tour?date=$today", '/api/patients', '/api/notifications?limit=100'],
            'labo' => ['/api/appointments', '/api/notifications?limit=100'],
            'pharmacie' => ['/api/pharmacy-orders?scope=received', '/api/notifications?limit=100'],
        ];
        echo "\n=== Vérification API (" . $this->apiBase . ") ===\n";
        foreach ($checks as $account => $paths) {
            foreach ($paths as $path) {
                $res = $this->api($account)->tryGet($path);
                $items = self::firstList($res['json']['data'] ?? null);
                $summary = $items === null ? 'pas de liste' : count($items) . ' élément(s)' . self::breakdown($items);
                printf("%-10s GET %-58s HTTP %d  %s\n", $account, $path, $res['status'], $res['status'] >= 400 ? ($res['json']['error'] ?? $res['raw']) : $summary);
            }
        }
    }

    /** @return list<mixed>|null */
    private static function firstList(mixed $data): ?array
    {
        if (!is_array($data)) {
            return null;
        }
        if (array_is_list($data)) {
            return $data;
        }
        foreach (['appointments', 'items', 'stops', 'patients', 'notifications', 'reviews', 'documents', 'prescriptions', 'orders', 'data'] as $key) {
            if (isset($data[$key]) && is_array($data[$key]) && array_is_list($data[$key])) {
                return $data[$key];
            }
        }

        return null;
    }

    /** @param list<mixed> $items */
    private static function breakdown(array $items): string
    {
        foreach (['status', 'visit_status', 'type', 'document_type', 'relationship_type'] as $key) {
            $values = array_filter(array_map(static fn ($i) => is_array($i) && isset($i[$key]) && is_string($i[$key]) ? $i[$key] : null, $items));
            if ($values !== []) {
                $counts = array_count_values($values);
                ksort($counts);

                return " [$key: " . implode(', ', array_map(static fn ($k, $v) => "$k=$v", array_keys($counts), $counts)) . ']';
            }
        }

        return '';
    }

    // ---------------------------------------------------------------- comptes

    /** SQL : l'API ne crée pas de compte pro sans le circuit d'inscription admin, ni de mot de passe pour un tiers. */
    private function prepareAccounts(): void
    {
        $crypto = new Crypto();
        $email = $crypto->encryptField(QA_PHARMACY_EMAIL);
        $first = $crypto->encryptField('Pharmacie');
        $last = $crypto->encryptField('du Vieux-Port');
        $this->pdo->prepare("
            INSERT IGNORE INTO profiles (id, role, emploi, email_encrypted, email_dek, email_hash,
                first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek)
            VALUES (?, 'pro', 'Pharmacien', ?, ?, ?, ?, ?, ?, ?)
        ")->execute([
            QA_PHARMACY, $email['encrypted'], $email['dek'], hash('sha256', QA_PHARMACY_EMAIL),
            $first['encrypted'], $first['dek'], $last['encrypted'], $last['dek'],
        ]);

        $update = $this->pdo->prepare('UPDATE profiles SET password_hash = ?, password_set_at = NOW(), must_change_password = 0 WHERE id = ?');
        foreach ([TestFixtures::PATIENT_B, QA_PHARMACY] as $profileId) {
            $update->execute([password_hash($this->password, PASSWORD_BCRYPT), $profileId]);
        }
        $this->log('Comptes prêts (bruno.patient@test.invalid, ' . QA_PHARMACY_EMAIL . ')');
    }

    private function loadCategories(): void
    {
        foreach ($this->pdo->query('SELECT id, name, type FROM care_categories WHERE is_active = 1') as $row) {
            $this->categories[$row['type'] . ':' . $row['name']] = (string) $row['id'];
        }
    }

    private function loginAll(): void
    {
        $accounts = [
            'alice' => TestFixtures::profiles()[TestFixtures::PATIENT_A]['email'],
            'bruno' => TestFixtures::profiles()[TestFixtures::PATIENT_B]['email'],
            'nina' => TestFixtures::profiles()[TestFixtures::NURSE]['email'],
            'pro' => TestFixtures::profiles()[TestFixtures::PRO]['email'],
            'preleveur' => TestFixtures::profiles()[TestFixtures::PRELEVEUR]['email'],
            'labo' => TestFixtures::profiles()[TestFixtures::LAB]['email'],
            'pharmacie' => QA_PHARMACY_EMAIL,
        ];
        foreach ($accounts as $key => $email) {
            $client = new QaApiClient($this->apiBase, $key);
            $client->login($email, $this->password);
            $this->clients[$key] = $client;
        }
        $this->log('Connexion API OK pour ' . implode(', ', array_keys($accounts)));
    }

    private function completeProfiles(): void
    {
        $this->api('alice')->send('PUT', '/api/users/' . TestFixtures::PATIENT_A, [
            'phone' => '06 12 34 56 78',
            'gender' => 'female',
            'birth_date' => '1986-04-12',
            'address' => self::address('12 Rue Paradis, 13001 Marseille', 43.2951, 5.3770, '13001'),
        ]);
        $this->api('bruno')->send('PUT', '/api/users/' . TestFixtures::PATIENT_B, [
            'phone' => '06 98 76 54 32',
            'gender' => 'male',
            'birth_date' => '1952-09-03',
            'address' => self::address('45 Boulevard Longchamp, 13001 Marseille', 43.3040, 5.3880, '13001'),
        ]);
        $this->api('nina')->send('PUT', '/api/users/' . TestFixtures::NURSE, [
            'phone' => '06 11 22 33 44',
            'rpps' => '10101010101',
            'address' => self::address('8 Rue Sainte, 13001 Marseille', 43.2925, 5.3700, '13001'),
        ]);
        $this->api('nina')->send('POST', '/api/coverage-zones', [
            'zone_type' => 'circle', 'center_lat' => 43.2925, 'center_lng' => 5.3700, 'radius_km' => 15,
        ]);
        $this->api('pro')->send('PUT', '/api/users/' . TestFixtures::PRO, [
            'emploi' => 'Médecin généraliste',
            'rpps' => '10202020202',
            'phone' => '04 91 00 11 22',
            'address' => self::address('3 Place Castellane, 13006 Marseille', 43.2860, 5.3830, '13006'),
        ]);
        $this->api('preleveur')->send('PUT', '/api/users/' . TestFixtures::PRELEVEUR, ['phone' => '06 55 44 33 22']);
        $this->api('pharmacie')->send('PUT', '/api/users/' . QA_PHARMACY, [
            'phone' => '04 91 33 44 55',
            'address' => self::address('20 Quai du Port, 13002 Marseille', 43.2965, 5.3698, '13002'),
        ]);
        $this->log('Profils complétés (adresses, téléphones, RPPS, zone infirmière 15 km)');
    }

    /** @return array{lea: string, jean: string} */
    private function seedRelatives(): array
    {
        $lea = $this->api('alice')->send('POST', '/api/patient-relatives', [
            'first_name' => 'Léa', 'last_name' => 'Patiente', 'relationship_type' => 'child',
            'gender' => 'female', 'birth_date' => '2016-05-20',
        ]);
        $jean = $this->api('alice')->send('POST', '/api/patient-relatives', [
            'first_name' => 'Jean', 'last_name' => 'Patiente', 'relationship_type' => 'parent',
            'gender' => 'male', 'birth_date' => '1950-11-02', 'phone' => '06 70 80 90 10',
        ]);
        $ids = ['lea' => (string) $lea['data']['id'], 'jean' => (string) $jean['data']['id']];
        $this->manifest['alice']['relatives'] = $ids;
        $this->log('Proches d\'Alice : Léa (enfant) ' . $ids['lea'] . ', Jean (parent) ' . $ids['jean']);

        return $ids;
    }

    private function linkPatients(): void
    {
        foreach (['pro', 'nina'] as $staff) {
            foreach ([TestFixtures::PATIENT_A, TestFixtures::PATIENT_B] as $patientId) {
                $this->api($staff)->send('POST', '/api/patients/adopt', ['patient_id' => $patientId]);
            }
        }
        $this->log('Alice et Bruno rattachés aux patients du pro et de Nina');
    }

    /** @return array{simone: string, claire: string, marcel: string} */
    private function seedStaffPatients(): array
    {
        $ids = [
            'simone' => $this->createPatient('nina', 'Simone', 'Leroy', 'simone.leroy.qa@test.invalid', '06 21 43 65 87', '1941-02-17', 'female',
                self::address('27 Rue d\'Aubagne, 13001 Marseille', 43.2938, 5.3815, '13001')),
            'claire' => $this->createPatient('preleveur', 'Claire', 'Martin', 'claire.martin.qa@test.invalid', '06 31 52 73 94', '1978-07-08', 'female',
                self::address('64 Rue de Rome, 13006 Marseille', 43.2905, 5.3800, '13006')),
            'marcel' => $this->createPatient('preleveur', 'Marcel', 'Durand', 'marcel.durand.qa@test.invalid', '06 41 62 83 05', '1947-12-24', 'male',
                self::address('110 La Canebière, 13001 Marseille', 43.2990, 5.3860, '13001')),
        ];
        $this->manifest['patients_crees'] = $ids;
        $this->log('Patients créés par les pros : Simone (Nina), Claire et Marcel (préleveur)');

        return $ids;
    }

    // ---------------------------------------------------------------- infirmier

    /** @param array{lea: string, jean: string} $relatives */
    private function seedNurseFlows(array $relatives): void
    {
        $alice = self::aliceIdentity();
        $bruno = self::brunoIdentity();

        $pending = $this->patientBooking('alice', 'nursing', $alice, ['Injection sous-cutanée'], $this->at(2, '09:30'));
        $this->manifest['alice']['rdv_en_attente_offre_nina'] = $pending;

        $confirmed = $this->patientBooking('alice', 'nursing', $alice, ['Pansement'], $this->at(4, '18:00'));
        $this->api('nina')->send('PUT', "/api/appointments/$confirmed", ['status' => 'confirmed']);
        $this->conversation($confirmed, [
            ['alice', 'Bonjour, le code de l\'immeuble est 2580B, 3e étage à gauche.'],
            ['nina', 'Merci Alice, c\'est noté. Pensez à préparer votre ordonnance et votre carte Vitale.'],
            ['alice', 'Parfait, à jeudi !'],
        ]);
        $this->manifest['alice']['rdv_a_venir_infirmier'] = $confirmed;

        $completed = $this->patientBooking('alice', 'nursing', $alice, ['Pansement complexe'], $this->staging('10:00'));
        $this->api('nina')->send('PUT', "/api/appointments/$completed", ['status' => 'confirmed']);
        $this->api('nina')->send('PUT', "/api/appointments/$completed", ['status' => 'completed']);
        $this->movePast($completed, $this->at(-6, '10:00'), $this->at(-6, '10:40'));
        $review = $this->api('alice')->send('POST', '/api/reviews', [
            'appointment_id' => $completed, 'reviewee_id' => TestFixtures::NURSE, 'reviewee_type' => 'nurse',
            'rating' => 5, 'comment' => 'Infirmière ponctuelle et très douce, pansement refait avec beaucoup de soin.',
        ]);
        $reviewId = (string) $review['data']['id'];
        $this->api('nina')->send('POST', "/api/reviews/$reviewId/response", [
            'response' => 'Merci beaucoup Alice, ravie d\'avoir pu vous aider. Bon rétablissement !',
        ]);
        $this->pdo->prepare('UPDATE reviews SET created_at = ?, response_at = ? WHERE id = ?')
            ->execute([$this->at(-5, '19:12'), $this->at(-5, '21:03'), $reviewId]);
        $this->manifest['alice']['rdv_termine_infirmier'] = $completed;
        $this->manifest['alice']['avis_laisse'] = $reviewId;

        $canceled = $this->patientBooking('alice', 'nursing', self::relativeIdentity('Léa', $alice), ['Vaccination'], $this->at(6, '16:00'), $relatives['lea']);
        $this->api('alice')->send('PUT', "/api/appointments/$canceled", ['status' => 'canceled']);
        $this->manifest['alice']['rdv_annule_proche_lea'] = $canceled;

        $brunoCompleted = $this->patientBooking('bruno', 'nursing', $bruno, ['Soins de plaies'], $this->staging('09:00'));
        $this->api('nina')->send('PUT', "/api/appointments/$brunoCompleted", ['status' => 'confirmed']);
        $this->api('nina')->send('PUT', "/api/appointments/$brunoCompleted", ['status' => 'completed']);
        $this->movePast($brunoCompleted, $this->at(-3, '09:00'), $this->at(-3, '09:35'));
        $brunoReview = $this->api('bruno')->send('POST', '/api/reviews', [
            'appointment_id' => $brunoCompleted, 'reviewee_id' => TestFixtures::NURSE, 'reviewee_type' => 'nurse',
            'rating' => 4, 'comment' => 'Très professionnelle, un peu de retard mais elle avait prévenu.',
        ]);
        $this->pdo->prepare('UPDATE reviews SET created_at = ? WHERE id = ?')->execute([$this->at(-2, '11:20'), (string) $brunoReview['data']['id']]);

        $this->manifest['nina']['demande_entrante_offre'] = $pending;
        $this->manifest['nina']['avis_recus'] = [$reviewId, (string) $brunoReview['data']['id']];
        $this->log('Flux infirmier : offre en attente, RDV accepté + conversation, 2 RDV terminés + 2 avis, RDV proche annulé');
    }

    private function seedNurseOwnPlanning(string $simoneId): void
    {
        $simone = self::identity('Simone', 'Leroy', '06 21 43 65 87', 'simone.leroy.qa@test.invalid',
            self::address('27 Rue d\'Aubagne, 13001 Marseille', 43.2938, 5.3815, '13001'));
        $tour = [
            ['08:30', $simoneId, $simone, 'Injection sous-cutanée'],
            ['11:00', TestFixtures::PATIENT_B, self::brunoIdentity(), 'Mesure tension / glycémie'],
            ['14:30', TestFixtures::PATIENT_A, self::aliceIdentity(), 'Pansement'],
            ['17:45', $simoneId, $simone, 'Surveillance'],
        ];
        $ids = [];
        foreach ($tour as [$time, $patientId, $identity, $care]) {
            $id = $this->staffBooking('nina', 'nursing', $patientId, $identity, [$care], $this->staging($time));
            $this->moveTo($id, $this->at(0, $time));
            $ids[$time] = $id;
        }

        $tourData = $this->api('nina')->get('/api/nurse/tour?date=' . $this->today->format('Y-m-d'));
        $stopId = self::findStopId($tourData, $ids['08:30']);
        $this->api('nina')->send('POST', "/api/nurse/tour/stops/$stopId/status", ['status' => 'done', 'finalize_appointment' => true]);
        $this->manifest['nina']['tournee_du_jour'] = $ids;

        $series = $this->api('nina')->send('POST', '/api/nurse/passages/series', [
            'patient_id' => $simoneId,
            'planning_type' => 'custom_dates',
            'planning_config' => ['dates' => array_map(fn (int $d): string => $this->today->modify("+$d days")->format('Y-m-d'), [1, 3, 5, 7, 9])],
            'time_slot' => 'morning',
            'duration_minutes' => 20,
            'nursing_items' => [$this->careItem('nursing', 'Injection sous-cutanée')],
            'notes' => 'Anticoagulant : injection quotidienne, surveiller les points de ponction.',
        ]);
        $this->manifest['nina']['serie_passages'] = [
            'series_id' => (string) $series['data']['series_id'],
            'appointment_ids' => $series['data']['appointment_ids'],
        ];
        $this->log('Planning Nina : tournée du jour (4 passages, le 1er terminé) et série de 5 passages pour Simone');
    }

    // ---------------------------------------------------------------- laboratoire / préleveur

    /** @param array{lea: string, jean: string} $relatives */
    private function seedLabFlows(array $relatives): void
    {
        $alice = self::aliceIdentity();

        $upcoming = $this->patientBooking('alice', 'blood_test', $alice, ['Bilan lipidique', 'NFS'], $this->at(3, '07:30'));
        $this->api('labo')->send('PUT', "/api/appointments/$upcoming", ['status' => 'confirmed']);
        $this->api('labo')->send('POST', "/api/appointments/$upcoming/reassign", [
            'assigned_lab_id' => TestFixtures::LAB, 'assigned_to' => TestFixtures::PRELEVEUR,
        ]);
        $this->api('alice')->upload('/api/medical-documents', [
            'appointment_id' => $upcoming, 'document_type' => 'ordonnance',
        ], 'ordonnance-bilan-lipidique.pdf', 'application/pdf', self::pdf('Ordonnance : bilan lipidique, NFS'));
        $this->conversation($upcoming, [
            ['preleveur', 'Bonjour Madame, je passerai entre 7h30 et 8h. Merci de rester à jeun depuis la veille au soir.'],
            ['alice', 'Bonjour, très bien. Je peux boire de l\'eau ?'],
            ['preleveur', 'Oui, de l\'eau uniquement. À jeudi matin.'],
        ]);
        $this->manifest['alice']['rdv_a_venir_prise_de_sang'] = $upcoming;
        $this->manifest['preleveur']['rdv_avec_conversation'] = $upcoming;

        $done = $this->patientBooking('alice', 'blood_test', $alice, ['Bilan thyroïdien'], $this->staging('08:00'));
        $this->api('labo')->send('PUT', "/api/appointments/$done", ['status' => 'confirmed']);
        $this->api('labo')->send('POST', "/api/appointments/$done/reassign", [
            'assigned_lab_id' => TestFixtures::LAB, 'assigned_to' => TestFixtures::PRELEVEUR,
        ]);
        $this->api('preleveur')->send('PUT', "/api/appointments/$done", ['status' => 'completed']);
        $results = $this->api('preleveur')->upload('/api/medical-documents', [
            'appointment_id' => $done, 'document_type' => 'resultats',
        ], 'resultats-bilan-thyroidien.pdf', 'application/pdf', self::pdf('Résultats : TSH 1,8 mUI/L (0,4 - 4,0)'));
        $this->movePast($done, $this->at(-12, '08:00'), $this->at(-12, '08:20'));
        $this->manifest['alice']['rdv_termine_prise_de_sang_avec_resultats'] = $done;
        $this->manifest['alice']['document_resultats'] = (string) ($results['data']['id'] ?? '');

        $jeanPending = $this->patientBooking('alice', 'blood_test', self::relativeIdentity('Jean', $alice), ['Glycémie à jeun'], $this->at(5, '08:00'), $relatives['jean']);
        $this->manifest['alice']['rdv_en_attente_proche_jean'] = $jeanPending;
        $this->log('Flux labo : prise de sang à venir (préleveur + ordonnance + conversation), terminée avec résultats, demande en attente pour Jean');
    }

    /** @param array{simone: string, claire: string, marcel: string} $patients */
    private function seedPreleveurMissions(array $patients): void
    {
        $claire = self::identity('Claire', 'Martin', '06 31 52 73 94', 'claire.martin.qa@test.invalid',
            self::address('64 Rue de Rome, 13006 Marseille', 43.2905, 5.3800, '13006'));
        $marcel = self::identity('Marcel', 'Durand', '06 41 62 83 05', 'marcel.durand.qa@test.invalid',
            self::address('110 La Canebière, 13001 Marseille', 43.2990, 5.3860, '13001'));
        $missions = [
            'aujourdhui_0745_terminee' => [$patients['claire'], $claire, ['Bilan martial'], 0, '07:45'],
            'aujourdhui_0915' => [$patients['marcel'], $marcel, ['HbA1c', 'Glycémie à jeun'], 0, '09:15'],
            'aujourdhui_1130' => [$patients['claire'], $claire, ['CRP'], 0, '11:30'],
            'a_venir_j2_0830' => [$patients['marcel'], $marcel, ['Bilan rénal'], 2, '08:30'],
        ];
        $ids = [];
        foreach ($missions as $key => [$patientId, $identity, $cares, $day, $time]) {
            $id = $this->staffBooking('preleveur', 'blood_test', $patientId, $identity, $cares, $this->staging($time));
            $this->api('preleveur')->send('PUT', "/api/appointments/$id", ['status' => 'confirmed']);
            $this->moveTo($id, $this->at($day, $time));
            $ids[$key] = $id;
        }
        $this->api('preleveur')->send('PUT', '/api/appointments/' . $ids['aujourdhui_0745_terminee'], ['status' => 'completed']);
        $this->manifest['preleveur']['missions'] = $ids;
        $this->log('Missions préleveur : 3 aujourd\'hui (1 terminée) et 1 à J+2');
    }

    // ---------------------------------------------------------------- pro / pharmacie

    private function seedProFlows(): void
    {
        $this->manifest['pro']['ordonnance_alice'] = $this->prescription('pro', TestFixtures::PATIENT_A, 'medical',
            "Bilan sanguin à jeun : NFS, glycémie à jeun, bilan lipidique.\nAmoxicilline 1 g : 1 comprimé matin et soir pendant 6 jours.");

        $nursing = $this->staffBooking('pro', 'nursing', TestFixtures::PATIENT_B, self::brunoIdentity(), ['Injection intramusculaire'],
            $this->at(2, '08:00'), ['assigned_nurse_id' => TestFixtures::NURSE]);
        $blood = $this->staffBooking('pro', 'blood_test', TestFixtures::PATIENT_A, self::aliceIdentity(), ['Bilan hépatique'],
            $this->at(5, '08:00'));
        $this->conversation($blood, [
            ['pro', 'Bonjour Alice, je vous ai programmé le bilan hépatique demandé lors de la consultation.'],
            ['alice', 'Merci docteur, je serai disponible ce matin-là.'],
        ]);
        $this->manifest['pro']['rdv'] = ['soin_bruno_confie_a_nina' => $nursing, 'prise_de_sang_alice_en_attente_labo' => $blood];
        $this->log('Flux pro : ordonnance médicale pour Alice, soin confié à Nina pour Bruno, prise de sang pour Alice');
    }

    private function seedPharmacyOrders(string $simoneId): void
    {
        $aliceDoc = $this->api('alice')->upload('/api/medical-documents', ['document_type' => 'ordonnance'],
            'ordonnance-traitement.pdf', 'application/pdf', self::pdf('Ordonnance : Levothyrox 75 µg, 1 cp/jour, 3 mois'));
        $aliceOrder = $this->pharmacyOrder('alice', TestFixtures::PATIENT_A, (string) $aliceDoc['data']['id'], 'click_collect', 1,
            'Je passerai en fin de journée.');
        foreach (['acceptee', 'en_cours', 'terminee'] as $status) {
            $this->api('pharmacie')->send('PATCH', "/api/pharmacy-orders/$aliceOrder", ['status' => $status, 'pharmacy_note' => 'Prête au comptoir.']);
        }

        $proOrder = $this->pharmacyOrder('pro', TestFixtures::PATIENT_A, $this->manifest['pro']['ordonnance_alice'], 'home_delivery', 2,
            'Patiente à mobilité réduite, merci de livrer.');
        foreach (['acceptee', 'en_cours'] as $status) {
            $this->api('pharmacie')->send('PATCH', "/api/pharmacy-orders/$proOrder", ['status' => $status]);
        }

        $ninaPrescription = $this->prescription('nina', $simoneId, 'nursing',
            'Soins infirmiers à domicile : injection sous-cutanée quotidienne pendant 10 jours, dimanches et jours fériés inclus.');
        $ninaOrder = $this->pharmacyOrder('nina', $simoneId, $ninaPrescription, 'click_collect', 2, 'Matériel d\'injection pour 10 jours.');
        $this->api('pharmacie')->send('PATCH', "/api/pharmacy-orders/$ninaOrder", ['status' => 'acceptee']);
        $this->api('pharmacie')->send('POST', "/api/pharmacy-orders/$ninaOrder/messages", [
            'body' => 'Bonjour, tout sera prêt demain à partir de 10h.',
        ]);

        $this->manifest['alice']['commande_pharmacie_terminee'] = $aliceOrder;
        $this->manifest['pro']['commande_envoyee_en_cours'] = $proOrder;
        $this->manifest['nina']['ordonnance_simone'] = $ninaPrescription;
        $this->manifest['nina']['commande_pharmacie_acceptee'] = $ninaOrder;
        $this->manifest['pharmacie']['commandes_recues'] = [$aliceOrder, $proOrder, $ninaOrder];
        $this->log('Commandes pharmacie : patiente (terminée), pro (en cours), infirmière (acceptée + message)');
    }

    // ---------------------------------------------------------------- briques

    /**
     * @param array<string, mixed> $identity
     * @param list<string> $cares
     */
    private function patientBooking(string $actor, string $type, array $identity, array $cares, string $scheduledAt, ?string $relativeId = null): string
    {
        $patientId = $actor === 'alice' ? TestFixtures::PATIENT_A : TestFixtures::PATIENT_B;
        $payload = $this->bookingPayload($type, $patientId, $identity, $cares, $scheduledAt);
        if ($relativeId !== null) {
            $payload['relative_id'] = $relativeId;
        }
        if ($type === 'blood_test') {
            $payload['lab_preference_mode'] = 'platform_match';
        }

        $id = (string) $this->api($actor)->send('POST', '/api/appointments', $payload)['data']['id'];
        $this->waitForDispatch($id);

        return $id;
    }

    /** La diffusion aux professionnels de la zone s'exécute après la réponse de création (PostCreateNotificationRunner). */
    private function waitForDispatch(string $appointmentId): void
    {
        $stmt = $this->pdo->prepare("SELECT 1 FROM appointment_dispatch_events WHERE appointment_id = ? AND event_type = 'zone_dispatch' LIMIT 1");
        for ($attempt = 0; $attempt < 50; $attempt++) {
            $stmt->execute([$appointmentId]);
            if ($stmt->fetchColumn() !== false) {
                return;
            }
            usleep(200_000);
        }
        throw new RuntimeException("Aucune diffusion aux professionnels pour le RDV $appointmentId après 10 s");
    }

    /**
     * @param array<string, mixed> $identity
     * @param list<string> $cares
     * @param array<string, mixed> $extra
     */
    private function staffBooking(string $actor, string $type, string $patientId, array $identity, array $cares, string $scheduledAt, array $extra = []): string
    {
        $payload = array_merge($this->bookingPayload($type, $patientId, $identity, $cares, $scheduledAt), ['patient_booking_consent' => true], $extra);

        return (string) $this->api($actor)->send('POST', '/api/appointments', $payload)['data']['id'];
    }

    /**
     * @param array<string, mixed> $identity
     * @param list<string> $cares
     * @return array<string, mixed>
     */
    private function bookingPayload(string $type, string $patientId, array $identity, array $cares, string $scheduledAt): array
    {
        $items = array_map(fn (string $name): array => $this->careItem($type, $name), $cares);
        [$hour] = explode(':', substr($scheduledAt, 11, 5));
        $range = [(int) $hour, min(20, (int) $hour + 2)];

        return [
            'type' => $type,
            'form_type' => $type,
            'patient_id' => $patientId,
            'category_id' => $items[0]['category_id'],
            'scheduled_at' => $scheduledAt,
            'address' => $identity['address'],
            ($type === 'nursing' ? 'nursing_items' : 'blood_test_items') => $items,
            'form_data' => [
                'first_name' => $identity['first_name'],
                'last_name' => $identity['last_name'],
                'phone' => $identity['phone'],
                'email' => $identity['email'],
                'address' => $identity['address'],
                'availability' => json_encode(['type' => 'custom', 'range' => $range]),
                'availability_type' => 'custom',
                'availabilityRange' => $range,
                'consent' => true,
            ],
        ];
    }

    /** @return array{category_id: string, label: string, care_options: array<never>} */
    private function careItem(string $type, string $name): array
    {
        $id = $this->categories[$type . ':' . $name] ?? null;
        if ($id === null) {
            throw new RuntimeException("Catégorie de soin introuvable : $type / $name");
        }

        return ['category_id' => $id, 'label' => $name, 'care_options' => []];
    }

    /** @param list<array{0: string, 1: string}> $messages */
    private function conversation(string $appointmentId, array $messages): void
    {
        $ids = [];
        foreach ($messages as [$actor, $body]) {
            $ids[] = (string) $this->api($actor)->send('POST', "/api/appointments/$appointmentId/conversation", ['body' => $body])['data']['id'];
        }
        // Messages postés dans la même seconde : on les étale pour un ordre d'affichage stable.
        $stmt = $this->pdo->prepare('UPDATE appointment_conversation_messages SET created_at = NOW() - INTERVAL ? MINUTE WHERE id = ?');
        foreach (array_reverse($ids) as $i => $id) {
            $stmt->execute([$i * 17, $id]);
        }
    }

    /** Génère l'ordonnance (PDF) puis la dépose, comme le parcours mobile. */
    private function prescription(string $actor, string $patientId, string $kind, string $text): string
    {
        $generated = $this->api($actor)->send('POST', '/api/prescriptions/generate', [
            'patient_id' => $patientId, 'prescription_kind' => $kind, 'prescription_text' => $text,
        ])['data'];
        $pdf = base64_decode((string) $generated['pdf_base64'], true);
        if ($pdf === false) {
            throw new RuntimeException("[$actor] PDF d'ordonnance illisible");
        }
        $doc = $this->api($actor)->upload('/api/medical-documents', [
            'patient_id' => $patientId,
            'document_type' => 'ordonnance',
            'prescription_kind' => $kind,
            'prescription_text' => (string) $generated['prescription_text'],
            'prescription_number' => (string) $generated['prescription_number'],
        ], (string) $generated['file_name'], 'application/pdf', $pdf);

        return (string) $doc['data']['id'];
    }

    private function pharmacyOrder(string $actor, string $patientId, string $documentId, string $mode, int $minDays, string $comment): string
    {
        $patient = $patientId === TestFixtures::PATIENT_A ? self::aliceIdentity() : null;
        $body = [
            'patient_id' => $patientId,
            'pharmacy_id' => QA_PHARMACY,
            'fulfillment_mode' => $mode,
            'desired_fulfillment_date' => $this->nextPharmacyDay($minDays),
            'prescription_document_ids' => [$documentId],
            'requester_comment' => $comment,
        ];
        if ($mode === 'home_delivery') {
            $address = ($patient ?? self::aliceIdentity())['address'];
            $body['delivery_address'] = ['formatted_address' => $address['label'], 'postal_code' => $address['postal_code']];
        }

        return (string) $this->api($actor)->send('POST', '/api/pharmacy-orders', $body)['data']['id'];
    }

    /** Pharmacie sans jours configurés : lundi à samedi (PharmacyOrderService). */
    private function nextPharmacyDay(int $minDays): string
    {
        $day = $this->today->modify("+$minDays days");
        while ((int) $day->format('N') === 7) {
            $day = $day->modify('+1 day');
        }

        return $day->format('Y-m-d');
    }

    /** SQL : l'API refuse les dates passées ; le RDV est créé dans le futur puis placé à sa date de démonstration. */
    private function moveTo(string $appointmentId, string $scheduledAt): void
    {
        $this->pdo->prepare('UPDATE appointments SET scheduled_at = ? WHERE id = ?')->execute([$scheduledAt, $appointmentId]);
    }

    /** SQL : RDV terminé dans le passé, avec un historique cohérent avec cette date. */
    private function movePast(string $appointmentId, string $scheduledAt, string $completedAt): void
    {
        $createdAt = (new DateTimeImmutable($scheduledAt))->modify('-3 days')->format('Y-m-d H:i:s');
        $this->pdo->prepare('UPDATE appointments SET scheduled_at = ?, completed_at = ?, created_at = ?, updated_at = ? WHERE id = ?')
            ->execute([$scheduledAt, $completedAt, $createdAt, $completedAt, $appointmentId]);
        $this->pdo->prepare("
            UPDATE appointment_status_updates
            SET created_at = CASE WHEN status = 'completed' THEN ? ELSE ? END
            WHERE appointment_id = ?
        ")->execute([$completedAt, (new DateTimeImmutable($createdAt))->modify('+2 hours')->format('Y-m-d H:i:s'), $appointmentId]);
        $this->pdo->prepare('UPDATE appointment_dispatch_events SET created_at = ? WHERE appointment_id = ?')
            ->execute([$createdAt, $appointmentId]);
    }

    /** @param array<string, mixed> $tour */
    private static function findStopId(array $tour, string $appointmentId): string
    {
        $found = null;
        $walk = static function (array $node) use (&$walk, &$found, $appointmentId): void {
            if (($node['appointment_id'] ?? null) === $appointmentId && !empty($node['stop_id'])) {
                $found = (string) $node['stop_id'];

                return;
            }
            foreach ($node as $child) {
                if (is_array($child) && $found === null) {
                    $walk($child);
                }
            }
        };
        $walk($tour);
        if ($found === null) {
            throw new RuntimeException("Arrêt de tournée introuvable pour le RDV $appointmentId");
        }

        return $found;
    }

    private function createPatient(string $actor, string $first, string $last, string $email, string $phone, string $birthDate, string $gender, array $address): string
    {
        $existing = $this->pdo->prepare("SELECT id FROM profiles WHERE email_hash = ? AND role = 'patient'");
        $existing->execute([hash('sha256', strtolower($email))]);
        $id = $existing->fetchColumn();
        if ($id !== false) {
            return (string) $id;
        }
        $created = $this->api($actor)->send('POST', '/api/patients', [
            'first_name' => $first, 'last_name' => $last, 'email' => $email, 'phone' => $phone,
            'birth_date' => $birthDate, 'gender' => $gender, 'address' => $address, 'patient_booking_consent' => true,
        ]);

        return (string) $created['data']['id'];
    }

    private function at(int $dayOffset, string $time): string
    {
        return $this->today->modify(sprintf('%+d days', $dayOffset))->format('Y-m-d') . ' ' . $time . ':00';
    }

    /** Date future unique pour la création API, avant déplacement SQL vers aujourd'hui ou le passé. */
    private function staging(string $time): string
    {
        return $this->at(20 + $this->stagingSlot++, $time);
    }

    private function api(string $key): QaApiClient
    {
        return $this->clients[$key];
    }

    /** @return array{label: string, lat: float, lng: float, postal_code: string, city: string, formatted_address: string} */
    private static function address(string $label, float $lat, float $lng, string $postalCode): array
    {
        return ['label' => $label, 'formatted_address' => $label, 'lat' => $lat, 'lng' => $lng, 'postal_code' => $postalCode, 'city' => 'Marseille'];
    }

    /** @return array<string, mixed> */
    private static function identity(string $first, string $last, string $phone, string $email, array $address): array
    {
        return ['first_name' => $first, 'last_name' => $last, 'phone' => $phone, 'email' => $email, 'address' => $address];
    }

    /** @return array<string, mixed> */
    private static function aliceIdentity(): array
    {
        return self::identity('Alice', 'Patiente', '06 12 34 56 78', 'alice.patient@test.invalid',
            self::address('12 Rue Paradis, 13001 Marseille', 43.2951, 5.3770, '13001'));
    }

    /** @return array<string, mixed> */
    private static function brunoIdentity(): array
    {
        return self::identity('Bruno', 'Patient', '06 98 76 54 32', 'bruno.patient@test.invalid',
            self::address('45 Boulevard Longchamp, 13001 Marseille', 43.3040, 5.3880, '13001'));
    }

    /**
     * @param array<string, mixed> $holder
     * @return array<string, mixed>
     */
    private static function relativeIdentity(string $first, array $holder): array
    {
        return array_merge($holder, ['first_name' => $first]);
    }

    private static function pdf(string $line): string
    {
        $text = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], iconv('UTF-8', 'Windows-1252//TRANSLIT', $line) ?: $line);
        $stream = "BT /F1 14 Tf 60 760 Td ($text) Tj ET";
        $objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
            '<< /Length ' . strlen($stream) . " >>\nstream\n$stream\nendstream",
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
        ];
        $pdf = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objects as $i => $object) {
            $offsets[] = strlen($pdf);
            $pdf .= ($i + 1) . " 0 obj\n$object\nendobj\n";
        }
        $xref = strlen($pdf);
        $pdf .= 'xref' . "\n0 " . (count($objects) + 1) . "\n0000000000 65535 f \n";
        foreach ($offsets as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }

        return $pdf . 'trailer << /Size ' . (count($objects) + 1) . " /Root 1 0 R >>\nstartxref\n$xref\n%%EOF\n";
    }

    private function log(string $message): void
    {
        echo '· ' . $message . "\n";
    }

    private function printManifest(): void
    {
        echo "\n=== IDs seedés (" . $this->today->format('Y-m-d') . ") ===\n";
        echo json_encode($this->manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
    }
}

/** Comptes de démo et patients créés par le seed (périmètre exact d'un --reset). */
function qaSeedScope(PDO $pdo): array
{
    $staff = [TestFixtures::NURSE, TestFixtures::PRO, TestFixtures::PRELEVEUR, TestFixtures::LAB, QA_LAB_B, QA_PHARMACY];
    $patients = [TestFixtures::PATIENT_A, TestFixtures::PATIENT_B];
    $stmt = $pdo->prepare("SELECT id FROM profiles WHERE email_hash = ? AND role = 'patient'");
    foreach (QA_CREATED_PATIENT_EMAILS as $email) {
        $stmt->execute([hash('sha256', $email)]);
        $id = $stmt->fetchColumn();
        if ($id !== false) {
            $patients[] = (string) $id;
        }
    }

    return ['staff' => $staff, 'patients' => $patients, 'all' => array_merge($staff, $patients)];
}

function qaSeedReset(PDO $pdo): void
{
    $scope = qaSeedScope($pdo);
    $in = static fn (array $ids): string => implode(',', array_fill(0, count($ids), '?'));
    $all = $scope['all'];
    $patients = $scope['patients'];
    $staff = $scope['staff'];

    $aptWhere = 'patient_id IN (' . $in($patients) . ') OR created_by IN (' . $in($all) . ') OR assigned_nurse_id IN (' . $in($staff)
        . ') OR assigned_lab_id IN (' . $in($staff) . ') OR assigned_to IN (' . $in($staff) . ') OR assigned_pro_id IN (' . $in($staff) . ')';
    $aptParams = array_merge($patients, $all, $staff, $staff, $staff, $staff);
    $docWhere = 'patient_id IN (' . $in($patients) . ') OR uploaded_by IN (' . $in($all) . ') OR appointment_id IN (SELECT id FROM appointments WHERE ' . $aptWhere . ')';
    $docParams = array_merge($patients, $all, $aptParams);

    $files = $pdo->prepare("SELECT file_path FROM medical_documents WHERE $docWhere");
    $files->execute($docParams);
    $paths = $files->fetchAll(PDO::FETCH_COLUMN);

    $pdo->beginTransaction();
    try {
        $run = static function (string $sql, array $params) use ($pdo): void {
            $pdo->prepare($sql)->execute($params);
        };
        $run('DELETE FROM pharmacy_orders WHERE requester_id IN (' . $in($all) . ') OR patient_id IN (' . $in($all) . ') OR pharmacy_id IN (' . $in($all) . ')', array_merge($all, $all, $all));
        $run("DELETE FROM medical_documents WHERE $docWhere", $docParams);
        $run("DELETE FROM appointments WHERE $aptWhere", $aptParams);
        $run('DELETE FROM nurse_passage_series WHERE nurse_id IN (' . $in($staff) . ')', $staff);
        $run('DELETE FROM nurse_tour_plans WHERE nurse_id IN (' . $in($staff) . ')', $staff);
        $run('DELETE FROM preleveur_tour_plans WHERE preleveur_id IN (' . $in($staff) . ')', $staff);
        $run('DELETE FROM patient_relatives WHERE patient_id IN (' . $in($patients) . ')', $patients);
        $run('DELETE FROM patient_professional_access WHERE patient_id IN (' . $in($patients) . ') OR professional_id IN (' . $in($staff) . ')', array_merge($patients, $staff));
        $run("DELETE FROM notifications WHERE type <> 'welcome' AND user_id IN (" . $in($all) . ')', $all);
        $run("DELETE FROM coverage_zones WHERE owner_id = ? AND role = 'nurse'", [TestFixtures::NURSE]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    $uploadsRoot = realpath(__DIR__ . '/../uploads/medical');
    foreach ($paths as $path) {
        $file = realpath(__DIR__ . '/..' . $path);
        if ($file !== false && $uploadsRoot !== false && str_starts_with($file, $uploadsRoot . DIRECTORY_SEPARATOR)) {
            unlink($file);
            if (glob(dirname($file) . '/*') === []) {
                rmdir(dirname($file));
            }
        }
    }
    echo '· Données de démo supprimées (' . count($patients) . " patients, comptes pro, fichiers médicaux)\n";
}

function qaSeedReport(PDO $pdo): void
{
    $scope = qaSeedScope($pdo);
    $in = implode(',', array_fill(0, count($scope['all']), '?'));
    $rows = $pdo->prepare("
        SELECT a.id, a.type, a.status, a.scheduled_at, a.patient_id, a.relative_id, a.created_by_role,
               a.assigned_nurse_id, a.assigned_lab_id, a.assigned_to, a.assigned_pro_id, a.passage_series_id
        FROM appointments a
        WHERE a.patient_id IN ($in) OR a.created_by IN ($in)
        ORDER BY a.scheduled_at
    ");
    $rows->execute(array_merge($scope['all'], $scope['all']));
    echo "\n=== Rendez-vous des comptes de démo ===\n";
    foreach ($rows as $r) {
        printf(
            "%s  %-10s %-10s %s  patient=%s%s créé_par=%s%s%s%s\n",
            $r['id'], $r['type'], $r['status'], $r['scheduled_at'], substr((string) $r['patient_id'], -4),
            $r['relative_id'] ? ' (proche)' : '', $r['created_by_role'],
            $r['assigned_nurse_id'] ? ' infirmier=' . substr((string) $r['assigned_nurse_id'], -4) : '',
            $r['assigned_to'] ? ' préleveur=' . substr((string) $r['assigned_to'], -4) : '',
            $r['passage_series_id'] ? ' série' : ''
        );
    }
    $counts = [
        'proches' => 'SELECT COUNT(*) FROM patient_relatives',
        'documents médicaux' => 'SELECT COUNT(*) FROM medical_documents',
        'messages RDV' => 'SELECT COUNT(*) FROM appointment_conversation_messages',
        'avis' => 'SELECT COUNT(*) FROM reviews',
        'commandes pharmacie' => 'SELECT COUNT(*) FROM pharmacy_orders',
        'séries de passages' => 'SELECT COUNT(*) FROM nurse_passage_series',
        'notifications' => 'SELECT COUNT(*) FROM notifications',
    ];
    echo "\n";
    foreach ($counts as $label => $sql) {
        echo str_pad($label, 22) . (int) $pdo->query($sql)->fetchColumn() . "\n";
    }
}

$seed = new QaSeed($pdo, $apiBase, $password);
try {
    if ($mode === 'reset') {
        qaSeedReset($pdo);
    }
    if ($mode === 'verify') {
        $seed->verify();
    } elseif ($mode !== 'report') {
        if ($seed->isSeeded()) {
            echo "Base déjà seedée : relancer avec --reset pour recréer le jeu (dates recalées sur aujourd'hui).\n";
        } else {
            $seed->run();
        }
    }
    qaSeedReport($pdo);
} catch (Throwable $e) {
    fwrite(STDERR, "\nÉCHEC du seed : " . $e->getMessage() . "\n");
    fwrite(STDERR, "La base peut être partiellement seedée : relancer avec --reset.\n");
    exit(1);
}

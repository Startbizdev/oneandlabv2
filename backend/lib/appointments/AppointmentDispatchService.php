<?php

declare(strict_types=1);

require_once __DIR__ . '/../Validation.php';
require_once __DIR__ . '/../CoverageZoneMatcher.php';
require_once __DIR__ . '/../NotificationMessageFormatter.php';
require_once __DIR__ . '/../EmailQueue.php';
require_once __DIR__ . '/../SmsQueue.php';
require_once __DIR__ . '/../admin/AdminDispatchEventLogger.php';

/**
 * Dispatch géographique et ciblé (offres, cloche, e-mail, SMS).
 */
final class AppointmentDispatchService
{
    public function __construct(
        private PDO $db,
        private Crypto $crypto,
        private NotificationService $notificationService,
        private AdminDispatchEventLogger $dispatchEventLogger,
    ) {
    }

    /**
     * Relance dispatchGeographic pour un RDV nursing (coordonnées et form_data en base).
     * @param string|null $creationBatchId Passer null pour utiliser creation_batch_id du RDV.
     */
    public function dispatchGeographicForNursingFromStoredLocation(
        string $appointmentId,
        ?string $excludeProfileId = null,
        ?string $creationBatchId = null
    ): void {
        $stmt = $this->db->prepare(
            'SELECT type, location_lat, location_lng, scheduled_at, form_data_encrypted, form_data_dek, creation_batch_id
             FROM appointments WHERE id = ?'
        );
        $stmt->execute([$appointmentId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || ($row['type'] ?? '') !== 'nursing') {
            throw new Exception('Rendez-vous soins introuvable ou type invalide');
        }
        $lat = $row['location_lat'] ?? null;
        $lng = $row['location_lng'] ?? null;
        if ($lat === null || $lng === null || $lat === '' || $lng === '') {
            throw new Exception('Coordonnées du rendez-vous manquantes pour le dispatch');
        }
        $formDataForDispatch = [];
        if (!empty($row['form_data_encrypted']) && !empty($row['form_data_dek'])) {
            try {
                $formDataJson = $this->crypto->decryptField(
                    $row['form_data_encrypted'],
                    $row['form_data_dek']
                );
                $formDataForDispatch = json_decode($formDataJson, true) ?? [];
            } catch (Throwable $e) {
                $formDataForDispatch = [];
            }
        }
        $batchId = $creationBatchId ?? ($row['creation_batch_id'] ?? null);
        $this->dispatchGeographic(
            $appointmentId,
            'nursing',
            (float) $lat,
            (float) $lng,
            $row['scheduled_at'] ?? null,
            $formDataForDispatch,
            $excludeProfileId,
            is_string($batchId) && $batchId !== '' ? $batchId : null
        );
    }

    private function pointInPolygon(float $lat, float $lng, array $polygon): bool
    {
        if (count($polygon) < 3) {
            return false;
        }

        $inside = false;
        $j = count($polygon) - 1;

        for ($i = 0; $i < count($polygon); $i++) {
            $xi = $polygon[$i][0];
            $yi = $polygon[$i][1];
            $xj = $polygon[$j][0];
            $yj = $polygon[$j][1];

            $intersect = (($yi > $lat) !== ($yj > $lat)) &&
                         ($lng < ($xj - $xi) * ($lat - $yi) / ($yj - $yi) + $xi);

            if ($intersect) {
                $inside = !$inside;
            }

            $j = $i;
        }

        return $inside;
    }

    /**
     * Préférence patient pour le genre de l'infirmier (form_data.public).
     * Si female/male : seuls les infirmiers avec genre déchiffré correspondant sont proposés ; genre inconnu = exclus.
     */
    private function extractPreferredNurseGender(?array $formData): string
    {
        if ($formData === null || $formData === []) {
            return 'any';
        }
        $raw = $formData['preferred_nurse_gender'] ?? 'any';
        if (!is_string($raw)) {
            return 'any';
        }
        $v = strtolower(trim($raw));
        if (in_array($v, ['female', 'male', 'any'], true)) {
            return $v;
        }
        return 'any';
    }

    private function pickClosestProfessionalsForDispatchSms(array $professionals, int $limit = 10): array
    {
        if ($limit <= 0 || $professionals === []) {
            return [];
        }

        $byId = [];
        foreach ($professionals as $p) {
            if (!isset($p['distance_km']) || !is_numeric($p['distance_km'])) {
                continue;
            }
            $id = (string) ($p['id'] ?? '');
            if ($id === '') {
                continue;
            }
            $dist = (float) $p['distance_km'];
            if (!isset($byId[$id]) || $dist < (float) $byId[$id]['distance_km']) {
                $byId[$id] = $p;
            }
        }

        $ranked = array_values($byId);
        usort($ranked, static function (array $a, array $b): int {
            return ((float) $a['distance_km']) <=> ((float) $b['distance_km']);
        });

        return array_slice($ranked, 0, $limit);
    }

    /**
     * Dispatch géographique : trouve les professionnels disponibles.
     * Pour blood_test : ne notifie que les labs qui acceptent les RDV et dont le délai min (min_booking_lead_time_hours) est respecté.
     * @param string|null $scheduledAt Date/heure du RDV (Y-m-d H:i:s) pour filtrer les labs par délai min
     * @param string|null $excludeProfileId En redispatch : exclure ce professionnel des offres et notifications
     */
    public function dispatchGeographic(string $appointmentId, string $type, float $lat, float $lng, ?string $scheduledAt = null, ?array $formData = null, ?string $excludeProfileId = null, ?string $creationBatchId = null): void
    {
        if ($excludeProfileId !== null) {
            $delStmt = $this->db->prepare('DELETE FROM appointment_offers WHERE appointment_id = ?');
            $delStmt->execute([$appointmentId]);
        }

        $appointmentCategoryId = null;
        $catStmt = $this->db->prepare('SELECT category_id FROM appointments WHERE id = ?');
        $catStmt->execute([$appointmentId]);
        $catRow = $catStmt->fetch(PDO::FETCH_ASSOC);
        if ($catRow && isset($catRow['category_id']) && $catRow['category_id'] !== null && $catRow['category_id'] !== '') {
            $appointmentCategoryId = (string) $catRow['category_id'];
        }

        $professionals = $this->professionalsInZones($this->fetchCoverageZones($type, null), $type, $lat, $lng);

        if ($type === 'nursing') {
            $pref = $this->extractPreferredNurseGender($formData);
            if ($pref === 'female' || $pref === 'male') {
                $professionals = array_values(array_filter($professionals, function ($p) use ($pref) {
                    $g = $p['gender'] ?? null;
                    if ($g === null || $g === '') {
                        return false;
                    }
                    return $pref === 'female' ? $g === 'female' : $g === 'male';
                }));
            }
        }

        if ($type === 'nursing') {
            $professionals = array_values(array_filter($professionals, function ($p) use ($appointmentCategoryId) {
                return $this->nurseAcceptsCategoryForDispatch((string) $p['id'], $appointmentCategoryId);
            }));
        }
        
        $professionals = $this->applyLabDispatchFilters($professionals, $type, $scheduledAt, $appointmentCategoryId);

        $this->publishDispatch($appointmentId, $type, $professionals, $scheduledAt, $formData, $excludeProfileId, $creationBatchId, [], 'Dans votre zone');
    }

    /**
     * RDV prise de sang « réseau choisi » : offres uniquement aux labos rattachés à la marque
     * dont la zone couvre l'adresse, avec les mêmes filtres que le dispatch zone.
     * Retourne le nombre de labos notifiés (0 = repli admin à la charge de l'appelant).
     */
    public function dispatchBrandLabs(string $appointmentId, string $brandId, float $lat, float $lng, ?string $scheduledAt = null, ?array $formData = null, ?string $excludeProfileId = null): int
    {
        if ($excludeProfileId !== null) {
            $delStmt = $this->db->prepare('DELETE FROM appointment_offers WHERE appointment_id = ?');
            $delStmt->execute([$appointmentId]);
        }

        require_once __DIR__ . '/../../models/LabBrand.php';
        $labIds = (new LabBrand($this->db))->listLabIds($brandId);
        if ($labIds === []) {
            return 0;
        }

        $catStmt = $this->db->prepare('SELECT category_id FROM appointments WHERE id = ?');
        $catStmt->execute([$appointmentId]);
        $categoryId = $catStmt->fetchColumn();
        $categoryId = ($categoryId !== false && $categoryId !== null && $categoryId !== '') ? (string) $categoryId : null;

        $professionals = $this->professionalsInZones($this->fetchCoverageZones('blood_test', $labIds), 'blood_test', $lat, $lng);
        $professionals = $this->applyLabDispatchFilters($professionals, 'blood_test', $scheduledAt, $categoryId);
        if ($excludeProfileId !== null) {
            $professionals = array_values(array_filter($professionals, static fn (array $p): bool => ($p['id'] ?? '') !== $excludeProfileId));
        }
        if ($professionals === []) {
            return 0;
        }

        return $this->publishDispatch(
            $appointmentId,
            'blood_test',
            $professionals,
            $scheduledAt,
            $formData,
            $excludeProfileId,
            null,
            ['source' => 'lab_brand', 'brand_id' => $brandId],
            'Réseau de laboratoires choisi'
        );
    }

    /**
     * Zones de couverture actives (infirmiers ou labs/sous-comptes). $restrictLabIds limite aux profils lab listés.
     *
     * @param list<string>|null $restrictLabIds
     * @return list<array<string, mixed>>
     */
    private function fetchCoverageZones(string $type, ?array $restrictLabIds): array
    {
        if ($restrictLabIds !== null && $restrictLabIds === []) {
            return [];
        }
        if ($type === 'nursing') {
            $roleFilter = 'nurse';
        } else {
            $roleFilter = "('lab', 'subaccount')";
        }
        
        // Récupérer toutes les zones de couverture actives avec l'adresse de l'infirmier
        if ($type === 'nursing') {
            $sql = "
                SELECT cz.*, p.id as profile_id, p.role,
                       p.address_encrypted, p.address_dek,
                       p.gender_encrypted, p.gender_dek
                FROM coverage_zones cz
                INNER JOIN profiles p ON cz.owner_id = p.id
                WHERE cz.role = ?
                AND cz.is_active = TRUE
                AND cz.radius_km IS NOT NULL
                AND p.address_encrypted IS NOT NULL
                AND p.address_dek IS NOT NULL
            ";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$roleFilter]);
        } else {
            // Labs/subaccounts : inclure toute zone active (centre ou adresse profil pour la distance)
            // p.lab_id : pour que le lab parent reçoive toujours les RDV des sous-comptes
            $sql = "
                SELECT cz.*, p.id as profile_id, p.role,
                       p.address_encrypted, p.address_dek,
                       p.is_accepting_appointments,
                       COALESCE(p.min_booking_lead_time_hours, 48) as min_booking_lead_time_hours,
                       COALESCE(p.accept_rdv_saturday, 1) as accept_rdv_saturday,
                       COALESCE(p.accept_rdv_sunday, 1) as accept_rdv_sunday,
                       p.lab_id
                FROM coverage_zones cz
                INNER JOIN profiles p ON cz.owner_id = p.id
                WHERE cz.role IN ('lab', 'subaccount')
                AND cz.is_active = TRUE
                AND cz.radius_km IS NOT NULL
                AND (cz.center_lat IS NOT NULL AND cz.center_lng IS NOT NULL
                     OR (p.address_encrypted IS NOT NULL AND p.address_dek IS NOT NULL))
            ";
            $params = [];
            if ($restrictLabIds !== null) {
                $sql .= " AND p.role = 'lab' AND p.id IN (" . implode(',', array_fill(0, count($restrictLabIds), '?')) . ')';
                $params = array_values($restrictLabIds);
            }
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
        }
        
        $zones = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return $zones;
    }

    /**
     * @param list<array<string, mixed>> $zones
     * @return list<array<string, mixed>>
     */
    private function professionalsInZones(array $zones, string $type, float $lat, float $lng): array
    {
        $professionals = [];
        
        foreach ($zones as $zone) {
            $isInZone = false;
            $distance = null;
            $profAddress = null;

            if ($zone['address_encrypted'] && $zone['address_dek']) {
                try {
                    $addressJson = $this->crypto->decryptField($zone['address_encrypted'], $zone['address_dek']);
                    $address = json_decode($addressJson, true);
                    if ($address && isset($address['lat'], $address['lng'])) {
                        $profAddress = $address;
                        $profLat = floatval($address['lat']);
                        $profLng = floatval($address['lng']);
                        $distance = 6371 * acos(
                            min(1.0, max(-1.0,
                                cos(deg2rad($lat)) * cos(deg2rad($profLat)) *
                                cos(deg2rad($profLng) - deg2rad($lng)) +
                                sin(deg2rad($lat)) * sin(deg2rad($profLat))
                            ))
                        );
                        $isInZone = CoverageZoneMatcher::appointmentInZone($lat, $lng, $zone, $profAddress);
                    }
                } catch (Exception $e) {
                    continue;
                }
            } else {
                if (isset($zone['center_lat'], $zone['center_lng'], $zone['radius_km'])) {
                    $profLat = floatval($zone['center_lat']);
                    $profLng = floatval($zone['center_lng']);
                    $distance = 6371 * acos(
                        min(1.0, max(-1.0,
                            cos(deg2rad($lat)) * cos(deg2rad($profLat)) *
                            cos(deg2rad($profLng) - deg2rad($lng)) +
                            sin(deg2rad($lat)) * sin(deg2rad($profLat))
                        ))
                    );
                    $isInZone = CoverageZoneMatcher::appointmentInZone($lat, $lng, $zone, null);
                }
            }

            if ($isInZone) {
                $entry = [
                    'id' => $zone['profile_id'],
                    'role' => $zone['role'],
                ];
                if ($distance !== null) {
                    $entry['distance_km'] = $distance;
                }
                if ($type === 'nursing') {
                    $entry['gender'] = null;
                    if (!empty($zone['gender_encrypted']) && !empty($zone['gender_dek'])) {
                        try {
                            $g = strtolower(trim((string) $this->crypto->decryptField($zone['gender_encrypted'], $zone['gender_dek'])));
                            if (in_array($g, ['male', 'female', 'other'], true)) {
                                $entry['gender'] = $g;
                            }
                        } catch (Throwable $e) {
                            // ignore
                        }
                    }
                }
                if ($type === 'blood_test' && isset($zone['is_accepting_appointments'], $zone['min_booking_lead_time_hours'])) {
                    $entry['is_accepting_appointments'] = (bool) $zone['is_accepting_appointments'];
                    $entry['min_booking_lead_time_hours'] = (int) $zone['min_booking_lead_time_hours'];
                    $entry['accept_rdv_saturday'] = (bool) ($zone['accept_rdv_saturday'] ?? true);
                    $entry['accept_rdv_sunday'] = (bool) ($zone['accept_rdv_sunday'] ?? true);
                    $entry['lab_id'] = !empty($zone['lab_id']) ? $zone['lab_id'] : null;
                }
                $professionals[] = $entry;
            }
        }
        return $professionals;
    }

    /**
     * Filtres labo (disponibilité, week-end, délai min, lab parent des sous-comptes, catégorie). Sans effet pour nursing.
     *
     * @param list<array<string, mixed>> $professionals
     * @return list<array<string, mixed>>
     */
    private function applyLabDispatchFilters(array $professionals, string $type, ?string $scheduledAt, ?string $appointmentCategoryId): array
    {
        // Pour blood_test sans lab assigné : exclure les labs qui n'acceptent pas les RDV, dont le délai min n'est pas respecté, ou qui n'acceptent pas samedi/dimanche
        if ($type === 'blood_test' && $scheduledAt !== null && $scheduledAt !== '') {
            $scheduledTs = strtotime($scheduledAt);
            $dayOfWeek = (int) date('w', $scheduledTs); // 0 = dimanche, 6 = samedi
            $now = time();
            $professionals = array_filter($professionals, function ($p) use ($scheduledTs, $now, $dayOfWeek) {
                if (empty($p['is_accepting_appointments'])) {
                    return false;
                }
                if ($dayOfWeek === 0 && empty($p['accept_rdv_sunday'])) {
                    return false;
                }
                if ($dayOfWeek === 6 && empty($p['accept_rdv_saturday'])) {
                    return false;
                }
                $minHours = (int) ($p['min_booking_lead_time_hours'] ?? 48);
                if ($minHours <= 0) {
                    return true;
                }
                $minAllowedTs = $now + ($minHours * 3600);
                return $scheduledTs >= $minAllowedTs;
            });
        }
        
        // Pour blood_test : ajouter le lab parent pour chaque sous-compte restant, afin qu'il reçoive toujours les RDV et puisse accepter pour eux
        if ($type === 'blood_test') {
            $labIdsToNotify = [];
            foreach ($professionals as $p) {
                if (($p['role'] ?? '') === 'subaccount' && !empty($p['lab_id'])) {
                    $labIdsToNotify[$p['lab_id']] = true;
                }
            }
            foreach (array_keys($labIdsToNotify) as $labId) {
                $professionals[] = ['id' => $labId, 'role' => 'lab'];
            }
            // Dédupliquer par id (un lab peut être déjà dans la liste via sa propre zone)
            $seen = [];
            $professionals = array_values(array_filter($professionals, function ($p) use (&$seen) {
                $id = $p['id'];
                if (in_array($id, $seen, true)) {
                    return false;
                }
                $seen[] = $id;
                return true;
            }));
        }

        if ($type === 'blood_test') {
            $professionals = array_values(array_filter($professionals, function ($p) use ($appointmentCategoryId) {
                return $this->labAcceptsCategoryForDispatch((string) $p['id'], $appointmentCategoryId);
            }));
        }
        return array_values($professionals);
    }

    /**
     * Offres + journal dispatch + cloche/e-mail + SMS (10 plus proches). Retourne le nombre de professionnels notifiés.
     *
     * @param list<array<string, mixed>> $professionals
     */
    private function publishDispatch(string $appointmentId, string $type, array $professionals, ?string $scheduledAt, ?array $formData, ?string $excludeProfileId, ?string $creationBatchId, array $eventMetadata, string $originLabel): int
    {
        if ($excludeProfileId !== null) {
            $professionals = array_values(array_filter($professionals, function ($p) use ($excludeProfileId) {
                return ($p['id'] ?? '') !== $excludeProfileId;
            }));
        }

        // SMS dispatch : 10 professionnels les plus proches (cloche/e-mail inchangés).
        $professionalsForSms = $this->pickClosestProfessionalsForDispatchSms($professionals, 10);
        
        // Limiter le nombre de professionnels notifiés pour éviter surcharge/timeout (100 max)
        $professionals = array_slice($professionals, 0, 100);
        
        // Enregistrer les offres (labs + infirmiers) pour afficher les RDV dans les listes et permettre la popup accepter/refuser
        $this->insertAppointmentOffers($appointmentId, $professionals);

        $profMeta = array_values(array_map(static function (array $p): array {
            return [
                'id' => (string) ($p['id'] ?? ''),
                'role' => $p['role'] ?? null,
            ];
        }, $professionals));
        $this->dispatchEventLogger->log(
            $appointmentId,
            'zone_dispatch',
            null,
            null,
            null,
            array_merge([
                'recipient_count' => count($professionals),
                'professionals' => $profMeta,
                'excluded_profile_id' => $excludeProfileId,
                'appointment_type' => $type,
                'is_redispatch_wave' => $excludeProfileId !== null,
            ], $eventMetadata)
        );
        
        // Pour un lot multi-soins : identifier les professionnels déjà notifiés pour ce lot (1 notif/lot/pro)
        $alreadyNotifiedForBatch = [];
        if ($creationBatchId !== null) {
            try {
                $batchNotifStmt = $this->db->prepare(
                    "SELECT DISTINCT user_id FROM notifications WHERE type = 'new_appointment_available' AND data LIKE ?"
                );
                $batchNotifStmt->execute(['%"creation_batch_id":"' . $creationBatchId . '"%']);
                $alreadyNotifiedForBatch = array_column($batchNotifStmt->fetchAll(PDO::FETCH_ASSOC), 'user_id');
            } catch (Exception $e) {
                // Ne pas bloquer le dispatch si la vérification échoue
            }
        }

        // Créer une notification web pour chaque professionnel trouvé
        foreach ($professionals as $professional) {
            // Lot multi-soins : ne pas créer de doublon (1 notification par lot par professionnel)
            if ($creationBatchId !== null && in_array($professional['id'], $alreadyNotifiedForBatch, true)) {
                continue;
            }
            try {
                $typeLabel = NotificationMessageFormatter::appointmentTypeLabel($type);
                $when = NotificationMessageFormatter::whenShort($formData, $scheduledAt);
                $notifData = ['appointment_id' => $appointmentId];
                if ($creationBatchId !== null) {
                    $notifData['creation_batch_id'] = $creationBatchId;
                }
                $this->notificationService->createNotification(
                    $professional['id'],
                    'new_appointment_available',
                    'Nouveau RDV',
                    NotificationMessageFormatter::joinParts([
                        $originLabel,
                        $typeLabel,
                        $when ?: null,
                    ]),
                    $notifData
                );
                // Email async (envoyé après la réponse HTTP)
                EmailQueue::add('new_appointment_pro', null, [
                    'appointment_id' => $appointmentId,
                    'scheduled_at' => $scheduledAt ?? date('Y-m-d H:i:s'),
                    'role' => $professional['role'] ?? ($type === 'nursing' ? 'nurse' : 'lab'),
                    'form_data' => $formData,
                ], $professional['id']);
            } catch (Exception $e) {
                // Continuer même si une notification échoue
            }
        }
        
        // SMS en file (shutdown) pour ne pas bloquer la réponse — 10 plus proches uniquement
        $scheduledAtStr = $scheduledAt ?? date('Y-m-d H:i:s');
        foreach ($professionalsForSms as $professional) {
            SmsQueue::addNewAppointment(
                $professional['id'],
                $appointmentId,
                $scheduledAtStr,
                (string) ($professional['role'] ?? 'nurse'),
                $type
            );
        }
        return count($professionals);
    }


    /**
     * Aligné sur GET /appointments : si l’infirmier a au moins une préf activée, seules les catégories cochées
     * (ou sans catégorie) reçoivent offre + notif. Aucune ligne en base = pas de filtre (comportement historique).
     */
    private function nurseAcceptsCategoryForDispatch(string $nurseId, ?string $categoryId): bool
    {
        try {
            $stmt = $this->db->prepare('SELECT COUNT(*) FROM nurse_category_preferences WHERE nurse_id = ? AND is_enabled = TRUE');
            $stmt->execute([$nurseId]);
            if ((int) $stmt->fetchColumn() === 0) {
                return true;
            }
            if ($categoryId === null || $categoryId === '') {
                return true;
            }
            $stmt = $this->db->prepare('SELECT 1 FROM nurse_category_preferences WHERE nurse_id = ? AND category_id = ? AND is_enabled = TRUE LIMIT 1');
            $stmt->execute([$nurseId, $categoryId]);
            return (bool) $stmt->fetchColumn();
        } catch (Throwable $e) {
            error_log('nurseAcceptsCategoryForDispatch: ' . $e->getMessage());
            return true;
        }
    }

    /**
     * Même logique pour les labs (lab_category_preferences.lab_id = profil lab ou sous-compte selon l’UI).
     */
    private function labAcceptsCategoryForDispatch(string $labPrefsProfileId, ?string $categoryId): bool
    {
        try {
            $chk = $this->db->query("SHOW TABLES LIKE 'lab_category_preferences'");
            if (!$chk || $chk->rowCount() === 0) {
                return true;
            }
            $stmt = $this->db->prepare('SELECT COUNT(*) FROM lab_category_preferences WHERE lab_id = ? AND is_enabled = TRUE');
            $stmt->execute([$labPrefsProfileId]);
            if ((int) $stmt->fetchColumn() === 0) {
                return true;
            }
            if ($categoryId === null || $categoryId === '') {
                return true;
            }
            $stmt = $this->db->prepare('SELECT 1 FROM lab_category_preferences WHERE lab_id = ? AND category_id = ? AND is_enabled = TRUE LIMIT 1');
            $stmt->execute([$labPrefsProfileId, $categoryId]);
            return (bool) $stmt->fetchColumn();
        } catch (Throwable $e) {
            error_log('labAcceptsCategoryForDispatch: ' . $e->getMessage());
            return true;
        }
    }

    /**
     * Une seule offre + notifications (cloche, e-mail, SMS) pour un RDV soins réservé depuis le profil d'un infirmier.
     * Évite le dispatch géographique (tous les infirmiers de la zone).
     */
    public function dispatchDirectedNurseOnly(
        string $appointmentId,
        string $nurseId,
        ?string $scheduledAt,
        ?array $formData
    ): void {
        try {
            $stmt = $this->db->prepare('SELECT id FROM profiles WHERE id = ? AND role = ? LIMIT 1');
            $stmt->execute([$nurseId, 'nurse']);
            if (!$stmt->fetchColumn()) {
                error_log('dispatchDirectedNurseOnly: profil infirmier invalide ou absent — id=' . $nurseId);

                return;
            }
        } catch (Throwable $e) {
            error_log('dispatchDirectedNurseOnly: ' . $e->getMessage());

            return;
        }

        $professionals = [['id' => $nurseId, 'role' => 'nurse']];
        $this->insertAppointmentOffers($appointmentId, $professionals);
        $this->dispatchEventLogger->log(
            $appointmentId,
            'direct_assign',
            null,
            null,
            $nurseId,
            ['target_role' => 'nurse', 'source' => 'directed_nurse_profile']
        );

        foreach ($professionals as $professional) {
            try {
                $this->notificationService->createNotification(
                    $professional['id'],
                    'new_appointment_available',
                    'Demande de rendez-vous',
                    'Un patient a demandé un rendez-vous pour des soins infirmiers depuis votre profil. Ouvrez la notification pour répondre.',
                    ['appointment_id' => $appointmentId]
                );
                EmailQueue::add('new_appointment_pro', null, [
                    'appointment_id' => $appointmentId,
                    'scheduled_at' => $scheduledAt ?? date('Y-m-d H:i:s'),
                    'role' => 'nurse',
                    'form_data' => $formData,
                ], $professional['id']);
            } catch (Exception $e) {
                // Continuer même si une notification échoue
            }
        }

        $scheduledAtStr = $scheduledAt ?? date('Y-m-d H:i:s');
        foreach ($professionals as $professional) {
            SmsQueue::addNewAppointment(
                $professional['id'],
                $appointmentId,
                $scheduledAtStr,
                (string) ($professional['role'] ?? 'nurse'),
                'nursing'
            );
        }
    }

    /**
     * Demande de prélèvement créée par un préleveur : offre + notifications pour son seul laboratoire,
     * qui valide puis réassigne. Pas de dispatch géographique.
     */
    public function dispatchDirectedLabOnly(
        string $appointmentId,
        string $labId,
        ?string $scheduledAt,
        ?array $formData
    ): void {
        try {
            $stmt = $this->db->prepare('SELECT role FROM profiles WHERE id = ? AND role IN (\'lab\', \'subaccount\') LIMIT 1');
            $stmt->execute([$labId]);
            $labRole = (string) ($stmt->fetchColumn() ?: '');
            if ($labRole === '') {
                error_log('dispatchDirectedLabOnly: profil laboratoire invalide ou absent — id=' . $labId);

                return;
            }
        } catch (Throwable $e) {
            error_log('dispatchDirectedLabOnly: ' . $e->getMessage());

            return;
        }

        $this->insertAppointmentOffers($appointmentId, [['id' => $labId, 'role' => $labRole]]);
        $this->dispatchEventLogger->log(
            $appointmentId,
            'direct_assign',
            null,
            null,
            $labId,
            ['target_role' => $labRole, 'source' => 'preleveur_request']
        );

        try {
            $this->notificationService->createNotification(
                $labId,
                'new_appointment_available',
                'Demande de prélèvement d\'un préleveur',
                'Un de vos préleveurs a créé une demande de prélèvement. Validez-la puis attribuez-la.',
                ['appointment_id' => $appointmentId]
            );
            EmailQueue::add('new_appointment_pro', null, [
                'appointment_id' => $appointmentId,
                'scheduled_at' => $scheduledAt ?? date('Y-m-d H:i:s'),
                'role' => $labRole,
                'form_data' => $formData,
            ], $labId);
        } catch (Exception $e) {
            error_log('dispatchDirectedLabOnly notify: ' . $e->getMessage());
        }

        SmsQueue::addNewAppointment($labId, $appointmentId, $scheduledAt ?? date('Y-m-d H:i:s'), $labRole, 'blood_test');
    }

    /**
     * Notification ciblée pour un RDV réservé via QR code d'un professionnel de santé (rôle pro).
     */
    public function dispatchDirectedProOnly(
        string $appointmentId,
        string $proId,
        ?string $scheduledAt,
        ?array $formData,
        string $appointmentType
    ): void {
        try {
            $stmt = $this->db->prepare('SELECT id FROM profiles WHERE id = ? AND role = ? LIMIT 1');
            $stmt->execute([$proId, 'pro']);
            if (!$stmt->fetchColumn()) {
                error_log('dispatchDirectedProOnly: profil pro invalide — id=' . $proId);

                return;
            }
        } catch (Throwable $e) {
            error_log('dispatchDirectedProOnly: ' . $e->getMessage());

            return;
        }

        $typeLabel = $appointmentType === 'blood_test' ? 'prélèvement' : 'rendez-vous';
        try {
            $this->notificationService->createNotification(
                $proId,
                'new_appointment_available',
                'Demande de rendez-vous',
                "Un patient a pris un {$typeLabel} via votre QR code Cary.",
                ['appointment_id' => $appointmentId]
            );
            EmailQueue::add('new_appointment_pro', null, [
                'appointment_id' => $appointmentId,
                'scheduled_at' => $scheduledAt ?? date('Y-m-d H:i:s'),
                'role' => 'pro',
                'form_data' => $formData,
            ], $proId);
        } catch (Exception $e) {
            error_log('dispatchDirectedProOnly notify: ' . $e->getMessage());
        }
    }

    /**
     * Enregistre les offres (appointment_offers) pour que les labs/infirmiers voient le RDV dans leur liste.
     */
    private function insertAppointmentOffers(string $appointmentId, array $professionals): void
    {
        try {
            $stmt = $this->db->prepare('INSERT IGNORE INTO appointment_offers (appointment_id, profile_id) VALUES (?, ?)');
            foreach ($professionals as $p) {
                $profileId = $p['id'] ?? null;
                if ($profileId) {
                    $stmt->execute([$appointmentId, $profileId]);
                }
            }
        } catch (Throwable $e) {
            // Table peut ne pas exister si migration 040 non exécutée
            error_log('insertAppointmentOffers: ' . $e->getMessage());
        }
    }
}

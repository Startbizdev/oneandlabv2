<?php

declare(strict_types=1);

require_once __DIR__ . '/../DbSchemaCache.php';
require_once __DIR__ . '/AppointmentCreationValidator.php';
require_once __DIR__ . '/AppointmentFormDataCrypto.php';
require_once __DIR__ . '/AppointmentReviewStats.php';
require_once __DIR__ . '/AppointmentListEnricher.php';
require_once __DIR__ . '/AppointmentItemsResolver.php';

/**
 * Lecture détaillée d'un rendez-vous (getById).
 */
final class AppointmentReadService
{
    public function __construct(
        private PDO $db,
        private Crypto $crypto,
        private Logger $logger,
        private AppointmentCreationValidator $validator,
        private AppointmentFormDataCrypto $formDataCrypto,
        private AppointmentReviewStats $reviewStats,
        private AppointmentItemsResolver $itemsResolver,
    ) {
    }
    public function getById(string $id, string $requesterId, string $requesterRole): ?array
    {
        $relativeProfileSelect = DbSchemaCache::tableHasColumn($this->db, 'patient_relatives', 'profile_id')
            ? 'pr.profile_id as relative_profile_id,'
            : '';
        $stmt = $this->db->prepare('
            SELECT
                a.*,
                ' . $relativeProfileSelect . '
                pr.first_name_encrypted as relative_first_name_encrypted,
                pr.first_name_dek as relative_first_name_dek,
                pr.last_name_encrypted as relative_last_name_encrypted,
                pr.last_name_dek as relative_last_name_dek,
                pr.email_encrypted as relative_email_encrypted,
                pr.email_dek as relative_email_dek,
                pr.phone_encrypted as relative_phone_encrypted,
                pr.phone_dek as relative_phone_dek,
                pr.relationship_type as relative_relationship_type,
                pr.birth_date_encrypted as relative_birth_date_encrypted,
                pr.birth_date_dek as relative_birth_date_dek,
                cc.name as category_name,
                cc.type as category_type,
                cc.icon as category_icon,
                cc.image_url as category_image_url
            FROM appointments a
            LEFT JOIN patient_relatives pr ON a.relative_id = pr.id
            LEFT JOIN care_categories cc ON a.category_id = cc.id
            WHERE a.id = ?
        ');
        $stmt->execute([$id]);
        $appointment = $stmt->fetch();

        if (!$appointment) {
            return null;
        }

        if (!empty($appointment['merged_into_appointment_id'])) {
            return $this->getById((string) $appointment['merged_into_appointment_id'], $requesterId, $requesterRole);
        }

        // Traiter les données du proche si présent
        if ($appointment['relative_id']) {
            $appointment['relative'] = [
                'id' => $appointment['relative_id'],
                'first_name' => $this->crypto->decryptField(
                    $appointment['relative_first_name_encrypted'],
                    $appointment['relative_first_name_dek']
                ),
                'last_name' => $this->crypto->decryptField(
                    $appointment['relative_last_name_encrypted'],
                    $appointment['relative_last_name_dek']
                ),
                'email' => $appointment['relative_email_encrypted'] ? $this->crypto->decryptField(
                    $appointment['relative_email_encrypted'],
                    $appointment['relative_email_dek']
                ) : null,
                'phone' => $appointment['relative_phone_encrypted'] ? $this->crypto->decryptField(
                    $appointment['relative_phone_encrypted'],
                    $appointment['relative_phone_dek']
                ) : null,
                'relationship_type' => $appointment['relative_relationship_type'],
                'birth_date' => (!empty($appointment['relative_birth_date_encrypted']) && !empty($appointment['relative_birth_date_dek']))
                    ? $this->crypto->decryptField($appointment['relative_birth_date_encrypted'], $appointment['relative_birth_date_dek'])
                    : null,
                'contact_is_parent' => false,
                'profile_id' => $appointment['relative_profile_id'] ?? null,
            ];

            // Fallback : si le proche n'a pas d'email/téléphone, utiliser ceux du patient parent
            if ((!$appointment['relative']['email'] || !$appointment['relative']['phone']) && $appointment['patient_id']) {
                try {
                    $stmtParent = $this->db->prepare('
                        SELECT email_encrypted, email_dek, phone_encrypted, phone_dek 
                        FROM profiles 
                        WHERE id = ?
                    ');
                    $stmtParent->execute([$appointment['patient_id']]);
                    $parent = $stmtParent->fetch();
                    
                    if ($parent) {
                        // Utiliser l'email du parent si le proche n'en a pas
                        if (!$appointment['relative']['email'] && $parent['email_encrypted'] && $parent['email_dek']) {
                            $appointment['relative']['email'] = $this->crypto->decryptField(
                                $parent['email_encrypted'],
                                $parent['email_dek']
                            );
                            $appointment['relative']['contact_is_parent'] = true;
                        }
                        
                        // Utiliser le téléphone du parent si le proche n'en a pas
                        if (!$appointment['relative']['phone'] && $parent['phone_encrypted'] && $parent['phone_dek']) {
                            $appointment['relative']['phone'] = $this->crypto->decryptField(
                                $parent['phone_encrypted'],
                                $parent['phone_dek']
                            );
                            $appointment['relative']['contact_is_parent'] = true;
                        }
                    }
                } catch (Exception $e) {
                    // Ignorer les erreurs de fallback, continuer avec les données du proche uniquement
                }
            }

            $this->validator->enrichRelativeMinorFromBirthDate($appointment['relative']);

            // Nettoyer les champs chiffrés du proche
            unset(
                $appointment['relative_first_name_encrypted'],
                $appointment['relative_first_name_dek'],
                $appointment['relative_last_name_encrypted'],
                $appointment['relative_last_name_dek'],
                $appointment['relative_email_encrypted'],
                $appointment['relative_email_dek'],
                $appointment['relative_phone_encrypted'],
                $appointment['relative_phone_dek'],
                $appointment['relative_relationship_type'],
                $appointment['relative_birth_date_encrypted'],
                $appointment['relative_birth_date_dek']
            );
        }
        
        // Déchiffrer adresse + form_data (indépendamment — ne pas perdre form_data si l'adresse échoue)
        $this->formDataCrypto->decryptSensitiveFields($appointment, $requesterId, $requesterRole);
        if (array_key_exists('visit_dates', $appointment)) {
            $appointment['visit_dates'] = AppointmentListEnricher::normalizeVisitDates($appointment['visit_dates']);
        }
        $this->enrichPreferredLabBrand($appointment, $requesterRole === 'super_admin');
        
        // Nettoyer les champs chiffrés
        unset($appointment['address_encrypted'], $appointment['address_dek']);
        unset($appointment['form_data_encrypted'], $appointment['form_data_dek']);
        
        // Libellés et infos d'assignation (lab / préleveur) pour la liste et pour la page patient (logo, adresse, tél)
        $appointment['assigned_lab_display_name'] = null;
        $appointment['assigned_lab_role'] = null;
        $appointment['assigned_lab_phone'] = null;
        $appointment['assigned_lab_address'] = null;
        $appointment['assigned_lab_profile_image_url'] = null;
        $appointment['assigned_lab_public_slug'] = null;
        $appointment['assigned_to_display_name'] = null;
        $appointment['assigned_to_phone'] = null;
        $appointment['assigned_to_address'] = null;
        $appointment['assigned_to_profile_image_url'] = null;
        $appointment['assigned_to_email'] = null;
        $appointment['assigned_to_public_slug'] = null;
        $appointment['assigned_nurse_display_name'] = null;
        $appointment['assigned_nurse_profile_image_url'] = null;
        $appointment['assigned_nurse_public_slug'] = null;
        $appointment['assigned_nurse_phone'] = null;
        try {
            require_once __DIR__ . '/../../models/User.php';
            $userModel = new User();
            if (!empty($appointment['assigned_lab_id'])) {
                $labProfile = $userModel->getById($appointment['assigned_lab_id'], 'system', 'system');
                if ($labProfile) {
                    $company = isset($labProfile['company_name']) ? trim((string)$labProfile['company_name']) : '';
                    $first = trim((string)($labProfile['first_name'] ?? ''));
                    $last = trim((string)($labProfile['last_name'] ?? ''));
                    $name = trim($first . ' ' . $last);
                    $appointment['assigned_lab_display_name'] = $company !== '' ? $company : ($name !== '' ? $name : null);
                    $appointment['assigned_lab_role'] = $labProfile['role'] ?? null;
                    $appointment['assigned_lab_phone'] = isset($labProfile['phone']) ? trim((string)$labProfile['phone']) : null;
                    $appointment['assigned_lab_address'] = isset($labProfile['address']['label']) ? trim((string)$labProfile['address']['label']) : (is_string($labProfile['address'] ?? null) ? trim($labProfile['address']) : null);
                    $appointment['assigned_lab_profile_image_url'] = isset($labProfile['profile_image_url']) ? trim((string)$labProfile['profile_image_url']) : null;
                    $appointment['assigned_lab_public_slug'] = isset($labProfile['public_slug']) && trim((string)$labProfile['public_slug']) !== '' ? trim((string)$labProfile['public_slug']) : null;
                }
            }
            if (!empty($appointment['assigned_nurse_id'])) {
                $nurseProfile = $userModel->getById($appointment['assigned_nurse_id'], 'system', 'system');
                if ($nurseProfile) {
                    $first = trim((string)($nurseProfile['first_name'] ?? ''));
                    $last = trim((string)($nurseProfile['last_name'] ?? ''));
                    $appointment['assigned_nurse_display_name'] = trim($first . ' ' . $last) ?: null;
                    $appointment['assigned_nurse_profile_image_url'] = isset($nurseProfile['profile_image_url']) ? trim((string)$nurseProfile['profile_image_url']) : null;
                    $appointment['assigned_nurse_public_slug'] = isset($nurseProfile['public_slug']) && trim((string)$nurseProfile['public_slug']) !== '' ? trim((string)$nurseProfile['public_slug']) : null;
                    $appointment['assigned_nurse_phone'] = isset($nurseProfile['phone']) ? trim((string)$nurseProfile['phone']) : null;
                }
            }
            if (!empty($appointment['assigned_to'])) {
                $preleveurProfile = $userModel->getById($appointment['assigned_to'], 'system', 'system');
                if ($preleveurProfile) {
                    $first = trim((string)($preleveurProfile['first_name'] ?? ''));
                    $last = trim((string)($preleveurProfile['last_name'] ?? ''));
                    $appointment['assigned_to_display_name'] = trim($first . ' ' . $last) ?: null;
                    $appointment['assigned_to_phone'] = isset($preleveurProfile['phone']) ? trim((string)$preleveurProfile['phone']) : null;
                    $appointment['assigned_to_address'] = isset($preleveurProfile['address']['label']) ? trim((string)$preleveurProfile['address']['label']) : (is_string($preleveurProfile['address'] ?? null) ? trim($preleveurProfile['address']) : null);
                    $appointment['assigned_to_profile_image_url'] = isset($preleveurProfile['profile_image_url']) ? trim((string)$preleveurProfile['profile_image_url']) : null;
                    $appointment['assigned_to_email'] = isset($preleveurProfile['email']) ? trim((string)$preleveurProfile['email']) : null;
                    $appointment['assigned_to_public_slug'] = isset($preleveurProfile['public_slug']) && trim((string) $preleveurProfile['public_slug']) !== '' ? trim((string) $preleveurProfile['public_slug']) : null;
                }
            }

            $this->reviewStats->applyToAppointment($appointment);

            // Origine du RDV (créateur)
            $appointment['creator_origin'] = null;
            $cb = $appointment['created_by'] ?? null;
            $cbRole = $appointment['created_by_role'] ?? null;
            $pid = $appointment['patient_id'] ?? null;
            if (!empty($cb) && $cbRole !== null && (string) $cbRole !== '') {
                if ($cbRole === 'patient' || ($pid !== null && (string) $cb === (string) $pid)) {
                    $appointment['creator_origin'] = [
                        'kind' => 'patient_platform',
                        'label' => 'cary',
                    ];
                } elseif ($cbRole === 'nurse') {
                    $cp = $userModel->getById((string) $cb, 'system', 'system');
                    if ($cp) {
                        $fn = trim((string) ($cp['first_name'] ?? ''));
                        $ln = trim((string) ($cp['last_name'] ?? ''));
                        $appointment['creator_origin'] = array_merge([
                            'kind' => 'nurse',
                            'id' => (string) $cb,
                            'display_name' => trim($fn . ' ' . $ln) ?: null,
                            'first_name' => $fn !== '' ? $fn : null,
                            'last_name' => $ln !== '' ? $ln : null,
                            'phone' => isset($cp['phone']) ? trim((string) $cp['phone']) : null,
                            'profile_image_url' => isset($cp['profile_image_url']) ? trim((string) $cp['profile_image_url']) : null,
                            'public_slug' => isset($cp['public_slug']) && trim((string) $cp['public_slug']) !== '' ? trim((string) $cp['public_slug']) : null,
                        ], $this->reviewStats->forUserId((string) $cb));
                    }
                } elseif ($cbRole === 'pro') {
                    $cp = $userModel->getById((string) $cb, 'system', 'system');
                    if ($cp) {
                        $fn = trim((string) ($cp['first_name'] ?? ''));
                        $ln = trim((string) ($cp['last_name'] ?? ''));
                        $emploi = isset($cp['emploi']) ? trim((string) $cp['emploi']) : '';
                        $bio = isset($cp['biography']) ? trim((string) $cp['biography']) : '';
                        $website = isset($cp['website_url']) ? trim((string) $cp['website_url']) : '';
                        $cover = isset($cp['cover_image_url']) ? trim((string) $cp['cover_image_url']) : '';
                        $socialLinks = null;
                        if (!empty($cp['social_links'])) {
                            if (is_string($cp['social_links'])) {
                                $decoded = json_decode($cp['social_links'], true);
                                if (is_array($decoded)) {
                                    $socialLinks = $decoded;
                                }
                            } elseif (is_array($cp['social_links'])) {
                                $socialLinks = $cp['social_links'];
                            }
                        }
                        $appointment['creator_origin'] = array_merge([
                            'kind' => 'pro',
                            'id' => (string) $cb,
                            'display_name' => trim($fn . ' ' . $ln) ?: null,
                            'first_name' => $fn !== '' ? $fn : null,
                            'last_name' => $ln !== '' ? $ln : null,
                            'phone' => isset($cp['phone']) ? trim((string) $cp['phone']) : null,
                            'adeli' => isset($cp['adeli']) ? trim((string) $cp['adeli']) : null,
                            'emploi' => $emploi !== '' ? $emploi : null,
                            'biography' => $bio !== '' ? $bio : null,
                            'profile_image_url' => isset($cp['profile_image_url']) ? trim((string) $cp['profile_image_url']) : null,
                            'cover_image_url' => $cover !== '' ? $cover : null,
                            'website_url' => $website !== '' ? $website : null,
                            'social_links' => $socialLinks,
                            'public_slug' => isset($cp['public_slug']) && trim((string) $cp['public_slug']) !== '' ? trim((string) $cp['public_slug']) : null,
                        ], $this->reviewStats->forUserId((string) $cb));
                    }
                } elseif (in_array($cbRole, ['lab', 'subaccount', 'preleveur'], true)) {
                    $cp = $userModel->getById((string) $cb, 'system', 'system');
                    if ($cp) {
                        $company = isset($cp['company_name']) ? trim((string) $cp['company_name']) : '';
                        $fn = trim((string) ($cp['first_name'] ?? ''));
                        $ln = trim((string) ($cp['last_name'] ?? ''));
                        $name = trim($fn . ' ' . $ln);
                        $appointment['creator_origin'] = array_merge([
                            'kind' => 'lab_team',
                            'id' => (string) $cb,
                            'role' => $cbRole,
                            'display_name' => $company !== '' ? $company : ($name !== '' ? $name : null),
                            'profile_image_url' => isset($cp['profile_image_url']) ? trim((string) $cp['profile_image_url']) : null,
                            'public_slug' => isset($cp['public_slug']) && trim((string) $cp['public_slug']) !== '' ? trim((string) $cp['public_slug']) : null,
                        ], $this->reviewStats->forUserId((string) $cb));
                    }
                } elseif ($cbRole === 'super_admin') {
                    $cp = $userModel->getById((string) $cb, 'system', 'system');
                    if ($cp) {
                        $fn = trim((string) ($cp['first_name'] ?? ''));
                        $ln = trim((string) ($cp['last_name'] ?? ''));
                        $appointment['creator_origin'] = [
                            'kind' => 'admin',
                            'id' => (string) $cb,
                            'display_name' => trim($fn . ' ' . $ln) ?: 'Administration Cary',
                            'badge' => 'Créé par l\'administration',
                        ];
                    } else {
                        $appointment['creator_origin'] = [
                            'kind' => 'admin',
                            'display_name' => 'Administration Cary',
                            'badge' => 'Créé par l\'administration',
                        ];
                    }
                }
            }
        } catch (Exception $e) {
            // Ne pas faire échouer getById si résolution des noms échoue
        }

        $mergedFilter = '';
        try {
            $hasMergedCol = (int) $this->db->query("
                SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'appointments'
                  AND COLUMN_NAME = 'merged_into_appointment_id'
            ")->fetchColumn() > 0;
            if ($hasMergedCol) {
                $mergedFilter = ' AND a.merged_into_appointment_id IS NULL';
            }
        } catch (Throwable $e) {
            $mergedFilter = '';
        }

        $appointment['batch_siblings'] = [];
        $batchId = $appointment['creation_batch_id'] ?? null;
        $batchType = $appointment['type'] ?? null;
        // Lots multisoins / multi prises de sang : mêmes règles que la liste (creation_batch_id + patient + type).
        if (
            !empty($batchId)
            && in_array((string) $batchType, ['nursing', 'blood_test'], true)
            && !empty($appointment['patient_id'])
        ) {
            $sql = '
                SELECT a.id, a.status, a.scheduled_at, cc.name AS category_name
                FROM appointments a
                LEFT JOIN care_categories cc ON a.category_id = cc.id
                WHERE a.creation_batch_id = ?
                  AND a.id != ?
                  AND a.patient_id = ?
                  AND a.type = ?
                  ' . $mergedFilter . '
                ORDER BY a.scheduled_at ASC
            ';
            $sibStmt = $this->db->prepare($sql);
            $sibStmt->execute([$batchId, $id, $appointment['patient_id'], $batchType]);
            $sibRows = $sibStmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($sibRows as $sr) {
                $appointment['batch_siblings'][] = [
                    'id' => $sr['id'],
                    'status' => $sr['status'],
                    'scheduled_at' => $sr['scheduled_at'],
                    'category_name' => $sr['category_name'],
                ];
            }
        }
        if (($appointment['type'] ?? '') === 'blood_test') {
            $appointment['blood_test_items'] = $this->itemsResolver->resolveBloodTestItemsForAppointment($appointment, null);
            // Libellés prestations pour une seule carte / bloc (lot multi-RDV legacy) : tous les actes du lot.
            $appointment['blood_test_items_display'] = $appointment['blood_test_items'];
            if (!empty($batchId) && !empty($appointment['patient_id'])) {
                $stmtBatchBlood = $this->db->prepare('
                    SELECT a.id
                    FROM appointments a
                    WHERE a.creation_batch_id = ?
                      AND a.patient_id = ?
                      AND a.type = \'blood_test\'
                      ' . $mergedFilter . '
                    ORDER BY a.scheduled_at ASC, a.created_at ASC, a.id ASC
                ');
                $stmtBatchBlood->execute([$batchId, $appointment['patient_id']]);
                $batchBloodIds = array_column($stmtBatchBlood->fetchAll(PDO::FETCH_ASSOC), 'id');
                if (count($batchBloodIds) > 1) {
                    $mergedDisp = $this->itemsResolver->mergeBloodTestItemsAcrossBatchAppointmentIds($batchBloodIds);
                    if (!empty($mergedDisp)) {
                        $appointment['blood_test_items_display'] = $mergedDisp;
                    }
                }
            }
        } else {
            $appointment['blood_test_items'] = [];
        }

        if (($appointment['type'] ?? '') === 'nursing') {
            $appointment['nursing_items'] = $this->itemsResolver->resolveNursingItemsForAppointment($appointment, null);
            $appointment['nursing_items_display'] = $appointment['nursing_items'];
            if (!empty($batchId) && !empty($appointment['patient_id'])) {
                $stmtBatchNursing = $this->db->prepare('
                    SELECT a.id
                    FROM appointments a
                    WHERE a.creation_batch_id = ?
                      AND a.patient_id = ?
                      AND a.type = \'nursing\'
                      ' . $mergedFilter . '
                    ORDER BY a.scheduled_at ASC, a.created_at ASC, a.id ASC
                ');
                $stmtBatchNursing->execute([$batchId, $appointment['patient_id']]);
                $batchNursingIds = array_column($stmtBatchNursing->fetchAll(PDO::FETCH_ASSOC), 'id');
                if (count($batchNursingIds) > 1) {
                    $mergedN = $this->itemsResolver->mergeNursingItemsAcrossBatchAppointmentIds($batchNursingIds);
                    if (!empty($mergedN)) {
                        $appointment['nursing_items_display'] = $mergedN;
                    }
                }
            }
        } else {
            $appointment['nursing_items'] = [];
            $appointment['nursing_items_display'] = [];
        }

        // Libellé e-mail patient + contact principal (titulaire) pour RDV « pour un proche »
        $appointment['patient_email_display'] = null;
        $appointment['booking_contact'] = null;
        if (!empty($appointment['patient_id'])) {
            try {
                require_once __DIR__ . '/../../models/User.php';
                $userModelPatient = new User();
                $patProfile = $userModelPatient->getById((string) $appointment['patient_id'], $requesterId, $requesterRole);
                if ($patProfile) {
                    if (!empty($patProfile['email_display'])) {
                        $appointment['patient_email_display'] = $patProfile['email_display'];
                    }
                    if (!empty($appointment['relative_id'])) {
                        $fn = trim((string) ($patProfile['first_name'] ?? ''));
                        $ln = trim((string) ($patProfile['last_name'] ?? ''));
                        $appointment['booking_contact'] = [
                            'first_name' => $fn !== '' ? $fn : null,
                            'last_name' => $ln !== '' ? $ln : null,
                            'phone' => isset($patProfile['phone']) ? trim((string) $patProfile['phone']) : null,
                            'email' => isset($patProfile['email']) ? trim((string) $patProfile['email']) : null,
                            'email_display' => $patProfile['email_display'] ?? null,
                        ];
                    }
                }
            } catch (Throwable $e) {
                // ignore
            }
        }

        // Ne pas exposer les métadonnées d’audit au portail patient (défense en profondeur)
        if ($requesterRole === 'patient') {
            unset($appointment['created_at'], $appointment['updated_at']);
        }

        return $appointment;
    }

    /** @param array<string, mixed> $appointment */
    private function enrichPreferredLabBrand(array &$appointment, bool $includeDispatchStats = false): void
    {
        if (!$this->hasColumn('appointments', 'preferred_lab_brand_id')) {
            return;
        }
        $brandId = $appointment['preferred_lab_brand_id'] ?? null;
        if ($brandId === null || $brandId === '') {
            return;
        }
        try {
            require_once __DIR__ . '/../../models/LabBrand.php';
            $brand = (new LabBrand($this->db))->getById((string) $brandId);
            if ($brand !== null) {
                $appointment['preferred_lab_brand_name'] = $brand['name'] ?? null;
                $appointment['preferred_lab_brand_logo_url'] = $brand['logo_url'] ?? null;
                if ($includeDispatchStats) {
                    $appointment['preferred_lab_brand_lab_count'] = count($brand['lab_ids'] ?? []);
                    $offers = $this->db->prepare('SELECT COUNT(*) FROM appointment_offers WHERE appointment_id = ?');
                    $offers->execute([(string) $appointment['id']]);
                    $appointment['preferred_lab_brand_offer_count'] = (int) $offers->fetchColumn();
                }
            }
        } catch (Throwable $e) {
            error_log('enrichPreferredLabBrand: ' . $e->getMessage());
        }
    }


    private function hasColumn(string $table, string $column): bool
    {
        static $cache = [];
        $key = $table . '.' . $column;
        if (array_key_exists($key, $cache)) {
            return $cache[$key];
        }
        try {
            $stmt = $this->db->prepare('
                SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
            ');
            $stmt->execute([$table, $column]);
            $cache[$key] = ((int) $stmt->fetchColumn()) > 0;
        } catch (Throwable $e) {
            $cache[$key] = false;
        }
        return $cache[$key];
    }
}

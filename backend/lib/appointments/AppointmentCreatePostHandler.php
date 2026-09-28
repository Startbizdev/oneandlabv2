<?php

declare(strict_types=1);

final class AppointmentCreatePostHandler
{
    /**
     * @param array<string, mixed> $user
     */
    public static function handle(
        PDO $db,
        Appointment $appointmentModel,
        AppointmentPostCreateEffects $postCreateEffects,
        array $user,
    ): void {
        // Création d'un rendez-vous — préleveur : uniquement reprise RDV prise de sang (blood_test + RDV source)
        $allowedCreateRoles = ['patient', 'pro', 'nurse', 'lab', 'subaccount', 'super_admin', 'preleveur'];
        if (!in_array($user['role'], $allowedCreateRoles, true)) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'Création de rendez-vous non autorisée pour ce rôle',
                'code' => 'FORBIDDEN',
            ]);
            exit;
        }

        // Création d'un rendez-vous
        $rawInput = file_get_contents('php://input');
        AppointmentApiLogging::logAppointment('=== DEBUT POST /appointments ===', ['raw_input_length' => strlen($rawInput)]);
        $input = json_decode($rawInput, true);

        // Vérifier que les données sont valides
        if (!is_array($input) || empty($input)) {
            AppointmentApiLogging::logAppointment('ERREUR: Données invalides ou manquantes', ['json_error' => json_last_error_msg(), 'input_preview' => substr($rawInput, 0, 200)]);
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Données invalides ou manquantes',
                'code' => 'VALIDATION_ERROR',
            ]);
            exit;
        }

        AppointmentApiLogging::logAppointment('Données reçues', [
            'has_type' => isset($input['type']),
            'has_form_type' => isset($input['form_type']),
            'has_address' => isset($input['address']),
            'has_scheduled_at' => isset($input['scheduled_at']),
            'has_patient_id' => isset($input['patient_id']),
            'has_form_data' => isset($input['form_data']),
            'keys' => array_keys($input),
        ]);

        // Remonter category_id en racine si envoyé uniquement dans form_data (ex: formulaire pro)
        if (empty($input['category_id']) && !empty($input['form_data']['category_id'])) {
            $input['category_id'] = $input['form_data']['category_id'];
        }

        StaffPatientConsent::validateOrFail($input, $user);

        if (!empty($input['relative_id'])) {
            $patientId = trim((string) ($input['patient_id'] ?? ''));
            $relativeId = trim((string) $input['relative_id']);
            $relativeOwner = $db->prepare(
                'SELECT 1 FROM patient_relatives WHERE id = ? AND patient_id = ? LIMIT 1'
            );
            $relativeOwner->execute([$relativeId, $patientId]);
            if ($patientId === '' || !$relativeOwner->fetchColumn()) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Le proche sélectionné ne correspond pas au titulaire du dossier.',
                    'code' => 'RELATIVE_PATIENT_MISMATCH',
                ]);
                exit;
            }
        }

        if ($user['role'] === 'preleveur') {
            $t = isset($input['type']) ? (string) $input['type'] : '';
            $ft = isset($input['form_type']) ? (string) $input['form_type'] : '';
            if ($t !== 'blood_test' || $ft !== 'blood_test') {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error' => 'Les préleveurs ne peuvent créer que des rendez-vous de prise de sang.',
                    'code' => 'FORBIDDEN',
                ]);
                exit;
            }
            $fromId = isset($input['reschedule_from_appointment_id']) ? trim((string) $input['reschedule_from_appointment_id']) : '';
            if ($fromId === '' || !Validation::uuid($fromId)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Identifiant du rendez-vous source requis pour cette action.',
                    'code' => 'VALIDATION_ERROR',
                ]);
                exit;
            }
            $stmtSrc = $db->prepare('SELECT type, assigned_lab_id, assigned_to, patient_id FROM appointments WHERE id = ? LIMIT 1');
            $stmtSrc->execute([$fromId]);
            $srcApt = $stmtSrc->fetch(PDO::FETCH_ASSOC);
            if (!$srcApt || ($srcApt['type'] ?? '') !== 'blood_test') {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error' => 'Rendez-vous source introuvable ou non autorisé.',
                    'code' => 'FORBIDDEN',
                ]);
                exit;
            }
            $stmtPrelLab = $db->prepare('SELECT lab_id FROM profiles WHERE id = ? AND role = ? LIMIT 1');
            $stmtPrelLab->execute([$user['user_id'], 'preleveur']);
            $prelProfile = $stmtPrelLab->fetch(PDO::FETCH_ASSOC);
            $prelLabId = $prelProfile['lab_id'] ?? null;
            $uidPrel = (string) $user['user_id'];
            $assignedToSrc = isset($srcApt['assigned_to']) && $srcApt['assigned_to'] !== null && $srcApt['assigned_to'] !== ''
                ? (string) $srcApt['assigned_to'] : '';
            $assignedLabSrc = isset($srcApt['assigned_lab_id']) && $srcApt['assigned_lab_id'] !== null && $srcApt['assigned_lab_id'] !== ''
                ? (string) $srcApt['assigned_lab_id'] : '';
            $allowedPrel = ($assignedToSrc !== '' && $assignedToSrc === $uidPrel)
                || ($prelLabId !== null && $prelLabId !== '' && $assignedLabSrc !== '' && $assignedLabSrc === (string) $prelLabId);
            if (!$allowedPrel) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error' => 'Vous ne pouvez reprendre ce rendez-vous que pour un patient dont le RDV vous est attribué ou appartient à votre laboratoire.',
                    'code' => 'FORBIDDEN',
                ]);
                exit;
            }
            // Sécurité serveur : une reprise créée par un préleveur doit rester rattachée
            // au préleveur et à son labo/sous-labo, même si le frontend n'envoie pas lab_id.
            $effectiveAssignedLabId = $prelLabId ?: $assignedLabSrc;
            if ($effectiveAssignedLabId === '') {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Aucun laboratoire associé au préleveur pour rattacher le nouveau rendez-vous.',
                    'code' => 'VALIDATION_ERROR',
                ]);
                exit;
            }
            $input['assigned_to'] = $uidPrel;
            $input['assigned_lab_id'] = $effectiveAssignedLabId;
            $input['status'] = 'confirmed';

            $patientSrc = isset($srcApt['patient_id']) ? (string) $srcApt['patient_id'] : '';
            $patientBody = isset($input['patient_id']) ? (string) $input['patient_id'] : '';
            if ($patientSrc !== '' && $patientBody !== '' && $patientSrc !== $patientBody) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Le patient ne correspond pas au rendez-vous repris.',
                    'code' => 'VALIDATION_ERROR',
                ]);
                exit;
            }
        }

        $inputForCreate = $input;
        unset($inputForCreate['reschedule_from_appointment_id']);

        $externalNurseInvite = null;
        if (!empty($inputForCreate['external_nurse_invite']) && is_array($inputForCreate['external_nurse_invite'])) {
            $externalNurseInvite = $inputForCreate['external_nurse_invite'];
            unset($inputForCreate['external_nurse_invite']);
        }
        if (!empty($inputForCreate['skip_zone_dispatch'])) {
            $inputForCreate['skip_zone_dispatch'] = true;
        }

        $postCreateEffects->resolveAttributionQrFromUtm($inputForCreate);

        if (!empty($inputForCreate['assigned_pro_id']) && !Validation::uuid((string) $inputForCreate['assigned_pro_id'])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'assigned_pro_id invalide',
                'code' => 'VALIDATION_ERROR',
            ]);
            exit;
        }

        if (!empty($inputForCreate['attribution_qr_id']) && !Validation::uuid((string) $inputForCreate['attribution_qr_id'])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'attribution_qr_id invalide',
                'code' => 'VALIDATION_ERROR',
            ]);
            exit;
        }

        if (($inputForCreate['type'] ?? '') === 'nursing') {
            $ni = $inputForCreate['nursing_items'] ?? ($inputForCreate['form_data']['nursing_items'] ?? null);
            if ($ni !== null && !is_array($ni)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Le champ nursing_items doit être un tableau lorsqu’il est fourni.',
                    'code' => 'VALIDATION_ERROR',
                ]);
                exit;
            }
            if (is_array($ni)) {
                foreach ($ni as $item) {
                    if (!is_array($item)) {
                        continue;
                    }
                    $cid = $item['category_id'] ?? null;
                    if ($cid !== null && $cid !== '' && !Validation::uuid((string) $cid)) {
                        http_response_code(400);
                        echo json_encode([
                            'success' => false,
                            'error' => 'Identifiant de catégorie invalide dans nursing_items.',
                            'code' => 'VALIDATION_ERROR',
                        ]);
                        exit;
                    }
                }
            }
        }

        try {
            AppointmentApiLogging::logAppointment('Appel à appointmentModel->create', ['user_id' => $user['user_id'], 'role' => $user['role']]);
            try {
                $createActor = $postCreateEffects->resolveCreateActor($user, $input);
            } catch (Exception $e) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => $e->getMessage(),
                    'code' => 'VALIDATION_ERROR',
                ]);
                exit;
            }
            $createUserId = $createActor['createUserId'];
            $createUserRole = $createActor['createUserRole'];
            $notifyCreatorRole = $createActor['notifyCreatorRole'];

            $id = $appointmentModel->create($inputForCreate, $createUserId, $createUserRole, false, (string) $user['user_id'], AppointmentRequestFingerprint::forInput($input));
            if ($appointmentModel->creationResponseAlreadyCompleted()) {
                echo json_encode(['success' => true, 'data' => ['id' => $id]]);
                exit;
            }
            AppointmentApiLogging::logAppointment('Rendez-vous créé avec succès', ['appointment_id' => $id]);

            try {
                $postCreateEffects->runAfterCreate(
                    $id,
                    $user,
                    $input,
                    $inputForCreate,
                    $createUserId,
                    $createUserRole,
                    $externalNurseInvite
                );
            } catch (Throwable $e) {
                if ($externalNurseInvite !== null && ($inputForCreate['type'] ?? '') === 'nursing') {
                    AppointmentApiLogging::logAppointmentError('invitation infirmier externe', ['error' => $e->getMessage(), 'appointment_id' => $id]);
                    http_response_code(503);
                    echo json_encode([
                        'success' => false,
                        'error' => $e->getMessage(),
                        'code' => 'NURSE_INVITE_FAILED',
                        'data' => ['id' => $id],
                    ], JSON_UNESCAPED_UNICODE);
                    exit;
                }
                throw $e;
            }

            $successJson = json_encode([
                'success' => true,
                'data' => ['id' => $id],
            ]);
            if ($successJson === false) {
                throw new Exception('Erreur encodage JSON (réponse création RDV)');
            }
            $appointmentModel->markCreationResponseCompleted();
            header('Content-Length: ' . strlen($successJson));
            echo $successJson;
            if (ob_get_level()) {
                ob_end_flush();
            }
            flush();

            PostCreateNotificationRunner::runAfterResponseSent(
                $appointmentModel,
                $id,
                $inputForCreate,
                $notifyCreatorRole,
                [AppointmentApiLogging::class, 'logAppointment']
            );
        } catch (Exception $e) {
            AppointmentApiLogging::logAppointmentError('ERREUR lors de la création du rendez-vous', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            AppointmentApiLogging::logAppointment('ERREUR lors de la création du rendez-vous', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            http_response_code($e instanceof AppointmentCreationConflict ? 409 : 400);
            echo json_encode([
                'success' => false,
                'error' => $e->getMessage(),
                'code' => $e instanceof AppointmentCreationConflict ? 'CREATION_REQUEST_CONFLICT' : 'VALIDATION_ERROR',
            ]);
        }
    }
}

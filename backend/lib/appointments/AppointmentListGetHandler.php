<?php

declare(strict_types=1);

final class AppointmentListGetHandler
{
    /**
     * @param array<string, mixed> $user
     */
    public static function handle(
        PDO $db,
        Appointment $appointmentModel,
        AppointmentListEnricher $listEnricher,
        array $user,
    ): void {
        @ini_set('memory_limit', '512M');

        AppointmentApiLogging::logAppointment('=== DEBUT GET /appointments ===');

        $listQuery = AppointmentListQuery::fromGlobals();
        $status = $listQuery->status;
        $type = $listQuery->type;
        $page = $listQuery->page;
        $limit = $listQuery->limit;
        $calendarView = $listQuery->calendarView;
        $listScope = $listQuery->listScope;
        $lightListPayload = $listQuery->lightListPayload;
        $offset = $listQuery->offset;
        $patientPeriod = $listQuery->patientPeriod;
        $dateFrom = $listQuery->dateFrom;
        $dateTo = $listQuery->dateTo;

        AppointmentApiLogging::logAppointment('Paramètres GET', [
            'status' => $status,
            'type' => $type,
            'page' => $page,
            'limit' => $limit,
            'offset' => $offset,
            'GET_array' => $_GET,
        ]);

        $schemaFlags = AppointmentListQueryBuilder::schemaFlags($db);
        $useRelativeJoin = $schemaFlags['useRelativeJoin'];
        $hasMergedColumn = $schemaFlags['hasMergedColumn'];

        $listSqlBuilder = new AppointmentListQueryBuilder(
            $db,
            $listQuery,
            $user,
            $useRelativeJoin,
            $hasMergedColumn
        );
        $listSql = $listSqlBuilder->build();
        $sql = $listSql->selectSql;
        $params = $listSql->params;
        $userId = $listSql->effectiveUserId;

        if ($user && ($user['role'] ?? '') === 'super_admin' && !empty($_GET['user_id']) && $listSql->effectiveRole !== ($user['role'] ?? '')) {
            AppointmentApiLogging::logAppointment('Super admin: RDV pour user_id', ['user_id' => $userId, 'role' => $listSql->effectiveRole]);
        }
        if ($user && ($user['role'] ?? '') === 'nurse') {
            $nurseTab = isset($_GET['nurse_tab']) ? trim((string) $_GET['nurse_tab']) : '';
            $nurseSegment = isset($_GET['nurse_segment']) ? trim((string) $_GET['nurse_segment']) : '';
            AppointmentApiLogging::logAppointment('Filtrage pour infirmier', ['user_id' => $userId, 'status' => $status, 'nurse_tab' => $nurseTab, 'nurse_segment' => $nurseSegment]);
        }

        $view = isset($_GET['view']) ? trim((string) $_GET['view']) : '';
        $skipCount = !empty($_GET['skip_count'])
            && in_array(strtolower(trim((string) $_GET['skip_count'])), ['1', 'true', 'yes'], true);

        if ($view === 'cards') {
            require_once __DIR__ . '/../AppointmentListCards.php';
            require_once __DIR__ . '/../AppointmentListPayload.php';

            $cardLimit = min(max($limit, 1), 48);
            $cardPage = max(1, $page);

            try {
                $cardMeta = AppointmentListCards::paginateCardKeys(
                    $db,
                    $sql,
                    $params,
                    $cardPage,
                    $cardLimit,
                    $skipCount
                );
            } catch (Throwable $e) {
                AppointmentApiLogging::logAppointmentError('pagination cartes RDV', ['error' => $e->getMessage()]);
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Erreur pagination cartes']);
                exit;
            }

            $fetchParams = $params;
            $repIdRows = AppointmentListCards::fetchRepresentativeIdRows(
                $db,
                $sql,
                $cardMeta['keys'],
                $fetchParams
            );
            $representativeIds = array_values(array_filter(array_map(
                static fn (array $row): string => (string) ($row['id'] ?? ''),
                $repIdRows
            )));

            if ($representativeIds === []) {
                echo json_encode([
                    'success' => true,
                    'data' => ['rows' => []],
                    'pagination' => [
                        'page' => $cardPage,
                        'limit' => $cardLimit,
                        'total_cards' => $cardMeta['total_cards'],
                        'has_more' => $cardMeta['has_more'],
                    ],
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $repPlaceholders = implode(',', array_fill(0, count($representativeIds), '?'));
            $fetchSql = $sql . " AND a.id IN ($repPlaceholders)";
            $fetchParams = array_merge($fetchParams, $representativeIds);
            $fetchSql .= ' ORDER BY a.created_at DESC, a.scheduled_at DESC';

            $fetchStmt = $db->prepare($fetchSql);
            $fetchStmt->execute($fetchParams);
            $appointments = $fetchStmt->fetchAll(PDO::FETCH_ASSOC);

            if ($user) {
                $decrypted = AppointmentListPayload::decryptRowsForList(
                    $appointmentModel,
                    $appointments,
                    $user['user_id'],
                    $user['role']
                );
                $decrypted = AppointmentListPayload::enrichForListCards(
                    $db,
                    $appointmentModel,
                    $decrypted,
                    $hasMergedColumn
                );
                $appointmentModel->enrichListAssigneeReviewStats($decrypted);
                $rows = AppointmentListCards::groupIntoRows($decrypted, $cardMeta['keys']);
            } else {
                $rows = [];
            }

            $totalCards = $cardMeta['total_cards'];
            if ($skipCount && $totalCards === 0) {
                $totalCards = ($cardPage - 1) * $cardLimit + count($rows);
                if ($cardMeta['has_more']) {
                    $totalCards = max($totalCards, $cardPage * $cardLimit + 1);
                }
            }

            AppointmentApiLogging::logAppointment('=== FIN GET /appointments view=cards ===', [
                'page' => $cardPage,
                'limit' => $cardLimit,
                'rows' => count($rows),
                'appointments_fetched' => count($appointments),
                'representatives_fetched' => count($representativeIds),
                'has_more' => $cardMeta['has_more'],
            ]);

            echo json_encode([
                'success' => true,
                'data' => [
                    'rows' => $rows,
                ],
                'pagination' => [
                    'page' => $cardPage,
                    'limit' => $cardLimit,
                    'total_cards' => $totalCards,
                    'has_more' => $cardMeta['has_more'],
                ],
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $countSql = $listSql->countSql;
        AppointmentApiLogging::logAppointment('Construction de la requête COUNT');
        AppointmentApiLogging::logAppointment('SQL avant COUNT', ['sql' => $sql, 'params' => $params]);
        AppointmentApiLogging::logAppointment('Requête COUNT construite', ['countSql' => $countSql]);

        $total = 0;
        if (!$skipCount) {
            try {
                AppointmentApiLogging::logAppointment('Exécution de la requête COUNT');
                $countStmt = $db->prepare($countSql);
                $countStmt->execute($params);
                $countResult = $countStmt->fetch();
                $total = $countResult ? (int) $countResult['total'] : 0;
                AppointmentApiLogging::logAppointment('Requête COUNT réussie', ['total' => $total]);
            } catch (PDOException $e) {
                // En cas d'erreur, logger et utiliser 0 comme valeur par défaut
                AppointmentApiLogging::logAppointment('ERREUR lors du comptage des rendez-vous', [
                    'error' => $e->getMessage(),
                    'code' => $e->getCode(),
                    'countSql' => $countSql,
                    'params' => $params,
                ]);
                $total = 0;
            }
        }

        [$orderBy, $orderParams] = $listSqlBuilder->buildOrderByClause();
        $params = array_merge($params, $orderParams);
        $sql .= $orderBy . ' LIMIT ' . (int) $limit . ' OFFSET ' . (int) $offset;

        AppointmentApiLogging::logAppointment('Exécution de la requête principale', ['sql' => $sql, 'params' => $params]);

        try {
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $appointments = $stmt->fetchAll();
            AppointmentApiLogging::logAppointment('Requête principale réussie', [
                'count' => count($appointments),
                'user_role' => $user['role'] ?? null,
                'status_filter' => $status,
            ]);

            // Log détaillé pour les infirmiers
            if ($user && $user['role'] === 'nurse') {
                $pendingCount = 0;
                $assignedCount = 0;
                $inZoneCount = 0;
                foreach ($appointments as $apt) {
                    if ($apt['status'] === 'pending') {
                        $pendingCount++;
                        if (empty($apt['assigned_nurse_id'])) {
                            $inZoneCount++;
                        } else {
                            $assignedCount++;
                        }
                    }
                }
                AppointmentApiLogging::logAppointment('Détails rendez-vous infirmier', [
                    'total' => count($appointments),
                    'pending' => $pendingCount,
                    'pending_assigned' => $assignedCount,
                    'pending_in_zone' => $inZoneCount,
                    'appointment_ids' => array_column($appointments, 'id'),
                ]);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            $errorMessage = $e->getMessage();
            $errorCode = $e->getCode();

            AppointmentApiLogging::logAppointment('ERREUR FATALE lors de la récupération des rendez-vous', [
                'error' => $errorMessage,
                'code' => $errorCode,
                'sql' => $sql,
                'params' => $params,
                'trace' => $e->getTraceAsString(),
            ]);
            AppointmentApiLogging::logAppointmentError('PDO liste RDV', [
                'error' => $errorMessage,
                'role' => $user['role'] ?? null,
                'limit' => $limit,
                'page' => $page,
            ]);

            // Retourner plus de détails en mode développement
            $response = [
                'success' => false,
                'error' => 'Erreur lors de la récupération des rendez-vous: ' . $errorMessage,
                'code' => 'DATABASE_ERROR',
            ];

            // En développement ou localhost, inclure plus de détails
            $isDevelopment = (isset($_ENV['APP_ENV']) && $_ENV['APP_ENV'] === 'development')
                          || (isset($_SERVER['HTTP_HOST']) && strpos($_SERVER['HTTP_HOST'], 'localhost') !== false);

            if ($isDevelopment) {
                $response['debug'] = [
                    'message' => $errorMessage,
                    'code' => $errorCode,
                    'sql' => $sql,
                    'params_count' => count($params),
                    'params' => $params,
                ];
            }

            echo json_encode($response);
            exit;
        }

        $decryptedAppointments = [];
        if ($user) {
            $decryptedAppointments = $listEnricher->enrich(
                $db,
                $appointmentModel,
                $appointments,
                $user,
                $userId,
                $lightListPayload,
                $hasMergedColumn
            );
        } else {
            foreach ($appointments as $appointment) {
                $decryptedAppointments[] = [
                    'id' => $appointment['id'],
                    'type' => $appointment['type'],
                    'status' => $appointment['status'],
                    'scheduled_at' => $appointment['scheduled_at'],
                ];
            }
        }

        $returnedCount = count($decryptedAppointments);
        // COUNT SQL incohérent (total=0 alors qu’il y a des lignes) : borne minimale pour l’UI.
        $countIncoherent = ($total === 0 && $returnedCount > 0);
        if ($countIncoherent) {
            $total = ($page - 1) * $limit + $returnedCount;
        }
        $hasMore = false;
        if ($limit > 0 && $returnedCount >= $limit) {
            if ($countIncoherent) {
                // Page pleine alors que le comptage global était à 0 : il peut exister d’autres pages.
                $hasMore = true;
            } else {
                $hasMore = ((($page - 1) * $limit + $returnedCount) < $total);
            }
        }

        AppointmentApiLogging::logAppointment('=== FIN GET /appointments - SUCCES ===', [
            'total' => $total,
            'returned' => $returnedCount,
            'has_more' => $hasMore,
        ]);

        $pages = $limit > 0 ? (int) ceil($total / $limit) : 0;
        $payload = [
            'success' => true,
            'data' => $decryptedAppointments,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => (int) $total,
                'pages' => $pages,
                'has_more' => $hasMore,
            ],
        ];
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            AppointmentApiLogging::logAppointmentError('json_encode liste RDV échoué', [
                'error' => json_last_error_msg(),
                'returned' => $returnedCount,
                'role' => $user['role'] ?? null,
                'memory_peak_mb' => round(memory_get_peak_usage(true) / 1048576, 1),
            ]);
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Réponse trop volumineuse. Réessayez avec une pagination plus petite.',
                'code' => 'PAYLOAD_TOO_LARGE',
            ]);
            exit;
        }
        echo $json;
    }
}

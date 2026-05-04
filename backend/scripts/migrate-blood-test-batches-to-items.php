<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Crypto.php';

$config = require __DIR__ . '/../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);

$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
$crypto = new Crypto();

function uuidv4(): string
{
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function decryptFormData(Crypto $crypto, array $row): array
{
    if (empty($row['form_data_encrypted']) || empty($row['form_data_dek'])) {
        return [];
    }
    try {
        $json = $crypto->decryptField($row['form_data_encrypted'], $row['form_data_dek']);
        $decoded = json_decode($json, true);
        return is_array($decoded) ? $decoded : [];
    } catch (Throwable $e) {
        return [];
    }
}

$db->beginTransaction();

try {
    $groups = $db->query("
        SELECT creation_batch_id, patient_id, COUNT(*) AS total
        FROM appointments
        WHERE type = 'blood_test'
          AND creation_batch_id IS NOT NULL
          AND creation_batch_id <> ''
          AND merged_into_appointment_id IS NULL
        GROUP BY creation_batch_id, patient_id
        HAVING total > 1
    ")->fetchAll(PDO::FETCH_ASSOC);

    $processed = 0;
    $merged = 0;
    $createdItems = 0;

    foreach ($groups as $group) {
        $stmt = $db->prepare("
            SELECT a.*, cc.name AS category_name
            FROM appointments a
            LEFT JOIN care_categories cc ON cc.id = a.category_id
            WHERE a.type = 'blood_test'
              AND a.creation_batch_id = ?
              AND a.patient_id = ?
              AND a.merged_into_appointment_id IS NULL
            ORDER BY a.scheduled_at ASC, a.created_at ASC, a.id ASC
        ");
        $stmt->execute([$group['creation_batch_id'], $group['patient_id']]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (count($rows) < 2) {
            continue;
        }

        $canonical = $rows[0];
        $canonicalId = (string) $canonical['id'];

        foreach ($rows as $index => $row) {
            $sourceId = (string) $row['id'];
            $exists = $db->prepare('SELECT 1 FROM appointment_blood_test_items WHERE appointment_id = ? AND source_appointment_id = ? LIMIT 1');
            $exists->execute([$canonicalId, $sourceId]);
            if (!$exists->fetchColumn()) {
                $formData = decryptFormData($crypto, $row);
                $careOptions = [];
                if (isset($formData['care_options']) && is_array($formData['care_options'])) {
                    $careOptions = $formData['care_options'];
                }
                $label = trim((string) ($row['category_name'] ?? ''));
                if ($label === '') {
                    $label = trim((string) ($formData['category_name'] ?? $formData['service_name'] ?? 'Acte de prise de sang'));
                }
                $ins = $db->prepare("
                    INSERT INTO appointment_blood_test_items
                    (id, appointment_id, category_id, label, care_options, source_appointment_id, sort_order, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                ");
                $ins->execute([
                    uuidv4(),
                    $canonicalId,
                    $row['category_id'] ?: null,
                    $label,
                    json_encode($careOptions, JSON_UNESCAPED_UNICODE),
                    $sourceId,
                    $index,
                ]);
                $createdItems++;
            }

            if ($sourceId !== $canonicalId) {
                $moveDocs = $db->prepare('UPDATE medical_documents SET appointment_id = ? WHERE appointment_id = ?');
                $moveDocs->execute([$canonicalId, $sourceId]);

                $mark = $db->prepare('UPDATE appointments SET merged_into_appointment_id = ?, updated_at = NOW() WHERE id = ?');
                $mark->execute([$canonicalId, $sourceId]);
                $merged++;
            }
        }

        $dedupe = $db->prepare("
            SELECT document_type, MIN(created_at) AS keep_created_at, COUNT(*) AS total
            FROM medical_documents
            WHERE appointment_id = ? AND document_type = 'ordonnance'
            GROUP BY document_type
            HAVING total > 1
        ");
        $dedupe->execute([$canonicalId]);
        if ($dedupe->fetch(PDO::FETCH_ASSOC)) {
            $docs = $db->prepare("
                SELECT id
                FROM medical_documents
                WHERE appointment_id = ? AND document_type = 'ordonnance'
                ORDER BY created_at ASC, id ASC
            ");
            $docs->execute([$canonicalId]);
            $ids = array_column($docs->fetchAll(PDO::FETCH_ASSOC), 'id');
            array_shift($ids);
            if (!empty($ids)) {
                $placeholders = implode(',', array_fill(0, count($ids), '?'));
                $del = $db->prepare("DELETE FROM medical_documents WHERE id IN ($placeholders)");
                $del->execute($ids);
            }
        }

        $processed++;
    }

    $db->commit();
    echo json_encode([
        'success' => true,
        'processed_batches' => $processed,
        'merged_appointments' => $merged,
        'created_items' => $createdItems,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
} catch (Throwable $e) {
    $db->rollBack();
    fwrite(STDERR, 'Erreur migration blood_test: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}

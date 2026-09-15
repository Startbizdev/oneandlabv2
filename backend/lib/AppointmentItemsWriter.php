<?php

declare(strict_types=1);

/** Keep stored acts in sync with an explicit edit, inside the appointment transaction. */
final class AppointmentItemsWriter
{
    public static function replace(PDO $db, string $type, string $appointmentId, array $items, callable $newId): void
    {
        $table = match ($type) {
            'blood_test' => 'appointment_blood_test_items',
            'nursing' => 'appointment_nursing_items',
            default => throw new InvalidArgumentException('Type de rendez-vous invalide.'),
        };
        if (!$db->inTransaction()) throw new LogicException('Appointment item edits require a transaction.');
        if (!$items) throw new InvalidArgumentException('Au moins un acte est requis.');

        $select = $db->prepare("SELECT id, category_id, sort_order FROM {$table} WHERE appointment_id = ? ORDER BY sort_order, id");
        $select->execute([$appointmentId]);
        $remaining = $select->fetchAll(PDO::FETCH_ASSOC);
        $update = $db->prepare("UPDATE {$table} SET category_id = ?, label = ?, care_options = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND appointment_id = ?");
        $insert = $db->prepare("INSERT INTO {$table} (id, appointment_id, category_id, label, care_options, source_appointment_id, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");

        foreach (array_values($items) as $index => $item) {
            if (!is_array($item)) throw new InvalidArgumentException('Acte invalide.');
            $category = $item['category_id'] ?? null;
            $match = null;
            // Match a stable category first; never accept a client-supplied source appointment.
            foreach ($remaining as $key => $stored) {
                if ($stored['category_id'] === $category) { $match = $key; break; }
            }
            if ($match === null) {
                foreach ($remaining as $key => $stored) {
                    if ((int) $stored['sort_order'] === $index) { $match = $key; break; }
                }
            }
            $options = json_encode($item['care_options'] ?? [], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
            $fields = [$category, $item['label'] ?? null, $options, $index];
            if ($match !== null) {
                $update->execute([...$fields, $remaining[$match]['id'], $appointmentId]);
                unset($remaining[$match]);
            } else {
                $insert->execute([$newId(), $appointmentId, ...$fields]);
            }
        }
        $delete = $db->prepare("DELETE FROM {$table} WHERE id = ? AND appointment_id = ?");
        foreach ($remaining as $stored) $delete->execute([$stored['id'], $appointmentId]);
    }
}

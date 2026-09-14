<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

/**
 * Régression : INSERT appointments — colonnes bindées = placeholders ? (hors created_at/updated_at).
 */
final class AppointmentCreateInsertTest extends TestCase
{
    public function testCreateInsertBindCountMatchesColumns(): void
    {
        $source = file_get_contents(dirname(__DIR__, 2) . '/models/Appointment.php');
        $this->assertIsString($source);

        if (!preg_match(
            '/\$insertFields\s*=\s*[\'"](.*?)[\'"]\s*;/s',
            $source,
            $fieldsMatch
        )) {
            $this->fail('Bloc insertFields introuvable dans Appointment::create');
        }

        $baseFields = preg_split('/\s*,\s*/', preg_replace('/\s+/', ' ', trim($fieldsMatch[1])));
        $baseFields = array_values(array_filter($baseFields, static fn ($f) => $f !== ''));

        $this->assertCount(
            27,
            $baseFields,
            'Le INSERT de base appointments doit binder 27 colonnes (hors created_at/updated_at)'
        );

        $this->assertStringContainsString(
            'array_fill(0, count($insertParams), \'?\')',
            $source,
            'Les placeholders doivent être générés dynamiquement depuis insertParams'
        );
    }
}

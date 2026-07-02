<?php

declare(strict_types=1);

/**
 * Définitions tools Grok (OpenAI-compatible) — source unique pour le parcours RDV.
 */
final class AiGrokToolCatalog
{
    /**
     * @return list<array<string, mixed>>
     */
    public static function bookingTools(): array
    {
        return [
            self::tool(
                'update_booking_draft',
                'Met à jour le brouillon RDV. Appelle dès que tu collectes ou modifies une info (patient, soin, créneau, adresse, ordonnance).',
                self::objectParameters([
                    'patch' => [
                        'type' => 'object',
                        'description' => 'Champs à fusionner : patient_mode, patient_id, first_name, last_name, type, category_id, category_name, scheduled_at, booking_step, ordonnance_status, use_profile_address, use_staff_practice_address, use_staff_contact_email, use_staff_contact_phone, selected_services, form_data, files, address (label texte si pas encore géocodé).',
                        'properties' => new stdClass(),
                        'additionalProperties' => true,
                    ],
                ], ['patch']),
            ),
            self::tool(
                'geocode_address',
                'Géocode une adresse postale (monde entier). Appelle quand l\'utilisateur donne ou corrige une adresse.',
                self::objectParameters([
                    'query' => [
                        'type' => 'string',
                        'description' => 'Adresse complète telle que comprise (numéro, voie, CP, ville, pays).',
                    ],
                ], ['query']),
            ),
            self::tool(
                'list_care_categories',
                'Liste les catégories de soins actives (infirmier / prélèvement).',
                self::objectParameters([
                    'type' => [
                        'type' => 'string',
                        'enum' => ['nursing', 'blood_test', 'all'],
                        'description' => 'Filtrer par type.',
                    ],
                ]),
            ),
            self::tool(
                'list_staff_patients',
                'Liste les patients connus du professionnel (infirmier/pro).',
                self::objectParameters([]),
            ),
            self::tool(
                'resolve_staff_patient',
                'Associe un patient existant du pro par id ou recherche par nom.',
                self::objectParameters([
                    'patient_id' => ['type' => 'string', 'description' => 'UUID patient si connu.'],
                    'search_name' => ['type' => 'string', 'description' => 'Prénom/nom pour recherche floue.'],
                ]),
            ),
        ];
    }

    /**
     * @param array<string, mixed> $properties
     * @param list<string> $required
     * @return array<string, mixed>
     */
    private static function objectParameters(array $properties, array $required = []): array
    {
        $schema = [
            'type' => 'object',
            'properties' => $properties === [] ? new stdClass() : $properties,
        ];
        if ($required !== []) {
            $schema['required'] = $required;
        }

        return $schema;
    }

    /**
     * @param array<string, mixed> $parameters
     * @return array<string, mixed>
     */
    private static function tool(string $name, string $description, array $parameters): array
    {
        return [
            'type' => 'function',
            'function' => [
                'name' => $name,
                'description' => $description,
                'parameters' => $parameters,
            ],
        ];
    }
}

<?php

declare(strict_types=1);

/**
 * Adresse d'un RDV : colonne chiffrée (+ coordonnées) et form_data.address portent toujours la même valeur.
 * Seul point d'écriture de l'adresse d'un RDV existant.
 */
final class AppointmentAddressFields
{
    /**
     * Fragment SQL et paramètres de la colonne d'adresse.
     *
     * @param array<string, mixed> $address
     * @return array{0: string, 1: list<mixed>}
     */
    public static function columns(Crypto $crypto, array $address): array
    {
        $label = $crypto->encryptField(trim((string) ($address['label'] ?? '')));

        return [
            'address_encrypted = ?, address_dek = ?, location_lat = ?, location_lng = ?',
            [$label['encrypted'], $label['dek'], (float) ($address['lat'] ?? 0), (float) ($address['lng'] ?? 0)],
        ];
    }

    /**
     * Reporte l'adresse dans form_data quand celui-ci en porte déjà une ; un form_data sans adresse reste sans adresse.
     *
     * @param array<string, mixed> $formData
     * @param array<string, mixed> $address
     * @return array<string, mixed>
     */
    public static function withFormDataAddress(array $formData, array $address): array
    {
        if (!isset($formData['address'])) {
            return $formData;
        }
        $formData['address'] = is_string($formData['address']) ? trim((string) ($address['label'] ?? '')) : $address;

        return $formData;
    }

    /**
     * Nouvelle adresse demandée : `address`, sinon un form_data.address modifié par rapport à l'existant.
     *
     * @param array<string, mixed> $data
     * @param array<string, mixed> $previousFormData
     * @return array<string, mixed>|null
     */
    public static function requested(array $data, array $previousFormData): ?array
    {
        if (self::hasLabel($data['address'] ?? null)) {
            return $data['address'];
        }
        $formAddress = is_array($data['form_data'] ?? null) ? ($data['form_data']['address'] ?? null) : null;
        if (self::hasLabel($formAddress) && $formAddress !== ($previousFormData['address'] ?? null)) {
            return $formAddress;
        }

        return null;
    }

    private static function hasLabel(mixed $address): bool
    {
        return is_array($address) && trim((string) ($address['label'] ?? '')) !== '';
    }
}

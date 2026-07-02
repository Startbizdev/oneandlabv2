<?php

declare(strict_types=1);

final class ClinicalVitalTypes
{
    public const ALL = [
        'blood_pressure',
        'heart_rate',
        'temperature',
        'spo2',
        'blood_glucose',
        'respiratory_rate',
        'pain_scale',
    ];

    /** @var array<string, array{label_fr: string, unit: string, has_secondary: bool, min: float, max: float}> */
    private const META = [
        'blood_pressure' => [
            'label_fr' => 'Tension',
            'unit' => 'mmHg',
            'has_secondary' => true,
            'min' => 40,
            'max' => 280,
        ],
        'heart_rate' => [
            'label_fr' => 'Fréquence cardiaque',
            'unit' => 'bpm',
            'has_secondary' => false,
            'min' => 20,
            'max' => 250,
        ],
        'temperature' => [
            'label_fr' => 'Température',
            'unit' => '°C',
            'has_secondary' => false,
            'min' => 30,
            'max' => 45,
        ],
        'spo2' => [
            'label_fr' => 'SpO2',
            'unit' => '%',
            'has_secondary' => false,
            'min' => 50,
            'max' => 100,
        ],
        'blood_glucose' => [
            'label_fr' => 'Glycémie',
            'unit' => 'g/L',
            'has_secondary' => false,
            'min' => 0.1,
            'max' => 6,
        ],
        'respiratory_rate' => [
            'label_fr' => 'Fréquence respiratoire',
            'unit' => '/min',
            'has_secondary' => false,
            'min' => 4,
            'max' => 60,
        ],
        'pain_scale' => [
            'label_fr' => 'Douleur (EVA)',
            'unit' => '/10',
            'has_secondary' => false,
            'min' => 0,
            'max' => 10,
        ],
    ];

    public static function isValid(string $type): bool
    {
        return in_array($type, self::ALL, true);
    }

    /**
     * @return array{label_fr: string, unit: string, has_secondary: bool, min: float, max: float}|null
     */
    public static function meta(string $type): ?array
    {
        return self::META[$type] ?? null;
    }

    public static function defaultUnit(string $type): string
    {
        return self::META[$type]['unit'] ?? 'unit';
    }

    /**
     * @return list<array{type: string, label_fr: string, unit: string, has_secondary: bool}>
     */
    public static function catalog(): array
    {
        $out = [];
        foreach (self::ALL as $type) {
            $meta = self::META[$type];
            $out[] = [
                'type' => $type,
                'label_fr' => $meta['label_fr'],
                'unit' => $meta['unit'],
                'has_secondary' => $meta['has_secondary'],
            ];
        }

        return $out;
    }
}

<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/NotificationMessageFormatter.php';

final class NotificationMessageFormatterWoundShareTest extends TestCase
{
    /** @return array<string, array{label: string, valueLabels: array<string,string>}> */
    private function optionMeta(): array
    {
        return [
            'wound_type' => [
                'label' => 'Type de plaie',
                'valueLabels' => [
                    'simple' => 'Simple',
                    'complexe' => 'Complexe',
                    'lourd' => 'Lourd',
                ],
            ],
            'location' => [
                'label' => 'Localisation',
                'valueLabels' => [
                    'jambe' => 'Jambe',
                    'pied' => 'Pied',
                ],
            ],
        ];
    }

    public function testFormatsSimpleWoundTypeFromNursingItem(): void
    {
        $this->assertSame(
            'Type de plaie : Simple',
            NotificationMessageFormatter::shareWoundCareDetails(
                ['care_options' => ['wound_type' => 'simple']],
                [],
                $this->optionMeta()
            )
        );
    }

    public function testFormatsComplexWoundTypeFromLegacyFormData(): void
    {
        $this->assertSame(
            'Type de plaie : Complexe',
            NotificationMessageFormatter::shareWoundCareDetails(
                ['care_options' => []],
                ['care_options' => ['wound_type' => 'complexe']],
                $this->optionMeta()
            )
        );
    }

    public function testFormatsHeavyWoundTypeUsingCatalogLabel(): void
    {
        $this->assertSame(
            'Type de plaie : Lourd',
            NotificationMessageFormatter::shareWoundCareDetails(
                ['care_options' => '{"wound_type":"lourd"}'],
                [],
                $this->optionMeta()
            )
        );
    }

    public function testFormatsWoundLocation(): void
    {
        $this->assertSame(
            'Type de plaie : Simple · Localisation : Pied',
            NotificationMessageFormatter::shareWoundCareDetails(
                ['care_options' => ['wound_type' => 'simple', 'location' => 'pied']],
                [],
                $this->optionMeta()
            )
        );
    }

    public function testHumanizesUnknownValueWithoutExposingRawKey(): void
    {
        $formatted = NotificationMessageFormatter::shareWoundCareDetails(
            ['care_options' => ['wound_type' => 'plaie_atypique']],
            [],
            $this->optionMeta()
        );

        $this->assertSame('Type de plaie : Plaie atypique', $formatted);
        $this->assertStringNotContainsString('wound_type', $formatted);
    }

    public function testMultiCareFallbackUsesMatchingFormDataByService(): void
    {
        $formData = [
            'selected_services' => [
                ['id' => 'service-injection', 'category_id' => 'category-injection', 'name' => 'Injection'],
                ['id' => 'service-wound', 'category_id' => 'category-wound', 'name' => 'Pansement-plaie'],
            ],
            'formDataByService' => [
                'service-injection' => ['care_options' => ['type' => 'intramusculaire']],
                'service-wound' => [
                    'care_options' => ['wound_type' => 'complexe', 'location' => 'jambe'],
                ],
            ],
            'care_options' => ['wound_type' => 'simple', 'location' => 'pied'],
        ];

        $this->assertSame(
            'Type de plaie : Complexe · Localisation : Jambe',
            NotificationMessageFormatter::shareWoundCareDetails(
                [
                    'category_id' => 'category-wound',
                    'category_name' => 'Pansement-plaie',
                    'care_options' => [],
                ],
                $formData,
                $this->optionMeta()
            )
        );
    }

    public function testHidesOtherChoiceButKeepsRealOnes(): void
    {
        $meta = $this->optionMeta();
        $meta['wound_type']['valueLabels']['autre'] = 'Autre';
        $meta['location']['valueLabels']['autre'] = 'Autre';

        $this->assertSame('', NotificationMessageFormatter::shareWoundCareDetails(
            ['care_options' => ['wound_type' => 'autre', 'location' => 'autre']],
            [],
            $meta
        ));
        $this->assertSame('Localisation : Pied', NotificationMessageFormatter::shareWoundCareDetails(
            ['care_options' => ['wound_type' => 'autre', 'location' => 'pied']],
            [],
            $meta
        ));
    }

    public function testShareFrequencyOnlyWhenInformative(): void
    {
        $this->assertSame('1 fois par jour', NotificationMessageFormatter::shareCareFrequencyPart(['duration_days' => '15', 'frequency' => 'once_daily']));
        $this->assertSame('', NotificationMessageFormatter::shareCareFrequencyPart(['duration_days' => '15', 'frequency' => 'to_define']));
        $this->assertSame('', NotificationMessageFormatter::shareCareFrequencyPart(['duration_days' => '1', 'frequency' => 'once_daily']));
    }
}

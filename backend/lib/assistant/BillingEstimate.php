<?php

declare(strict_types=1);

require_once __DIR__ . '/../AppTimezone.php';

/**
 * Estimation de facturation infirmière : l'assistant dit quels actes sont faits à chaque passage (cotations NGAP), le
 * serveur applique les règles de facturation et fait les calculs avec la grille officielle des tarifs
 * (resources/ngap/tarifs-infirmiers.json, ameli.fr). Règles appliquées ici, jamais laissées au modèle :
 *  - cumul (article 11B des dispositions générales) : acte au plus fort coefficient à 100 %, deuxième à 50 %, suivants non
 *    facturés ; seul un acte déclaré cumulable à taux plein par la NGAP (prise de sang) échappe à la règle ;
 *  - IFD à chaque passage à domicile ;
 *  - MAU quand le passage ne compte qu'un acte AMI de coefficient au plus 1,5 (article 23.1).
 */
final class BillingEstimate
{
    public const TARIFFS = __DIR__ . '/../../resources/ngap/tarifs-infirmiers.json';
    /** Lettres clés d'actes (le reste de la grille : indemnités et majorations). */
    private const ACT_CODES = ['AMI', 'AMX', 'AIS', 'BSA', 'BSB', 'BSC', 'DI', 'TMI', 'TLS', 'TLL', 'TLD'];
    private const MAU_MAX_COEFFICIENT = 1.5;

    /** @var array<string, mixed>|null */
    private static ?array $tariffs = null;

    public static function available(): bool
    {
        return is_file(self::TARIFFS);
    }

    /** @return list<string> codes acceptés (lettres clés, indemnités, majorations) */
    public static function codes(): array
    {
        return array_keys(self::tariffs()['zones']['metropole'] ?? []);
    }

    /**
     * @param array<string, mixed> $input passages, domicile, dimanche_ferie, jours_par_semaine, duree_jours, date_debut, zone
     * @return array<string, mixed>
     */
    public static function estimate(array $input): array
    {
        $grid = self::tariffs();
        $zone = ($input['zone'] ?? '') === 'outre_mer' ? 'outre_mer' : 'metropole';
        $prices = $grid['zones'][$zone];
        $passages = is_array($input['passages'] ?? null) ? array_slice($input['passages'], 0, 12) : [];
        if ($passages === []) {
            return ['error' => 'Aucun passage à chiffrer.'];
        }

        $home = ($input['domicile'] ?? true) !== false;
        $lines = [];
        $day = 0.0;
        foreach ($passages as $i => $passage) {
            $label = mb_substr(trim((string) ($passage['label'] ?? '')), 0, 40) ?: 'Passage ' . ($i + 1);
            $acts = [];
            foreach (is_array($passage['actes'] ?? null) ? $passage['actes'] : [] as $acte) {
                $code = strtoupper(trim((string) ($acte['code'] ?? '')));
                $coef = (float) str_replace(',', '.', (string) ($acte['coefficient'] ?? 0));
                if (!in_array($code, self::ACT_CODES, true) || !isset($prices[$code]) || $coef <= 0 || $coef > 100) {
                    return ['error' => 'Acte invalide dans « ' . $label . ' » : code ' . ($code ?: '?') . ', coefficient ' . $coef . ' (lettres clés : ' . implode(', ', self::ACT_CODES) . ').'];
                }
                // Prélèvement par ponction veineuse directe : cumulable à taux plein (NGAP, titre XVI, chapitre I, article 1er).
                $libelle = (string) ($acte['libelle'] ?? '');
                $full = ($acte['cumul_taux_plein'] ?? false) === true
                    || ($code === 'AMI' && abs($coef - 1.5) < 0.001 && preg_match('/prise de sang|ponction veineuse|pr[ée]l[èe]vement sanguin|bilan sanguin/iu', $libelle) === 1);
                $acts[] = ['code' => $code, 'coef' => $coef, 'full' => $full];
            }
            if ($acts === []) {
                return ['error' => 'Passage « ' . $label . ' » sans acte.'];
            }
            // Article 11B : le plus fort coefficient d'abord ; les actes cumulables à taux plein restent hors du rang.
            usort($acts, static fn (array $a, array $b): int => $b['coef'] <=> $a['coef']);
            $parts = [];
            $amount = 0.0;
            $rank = 0;
            foreach ($acts as $act) {
                $taux = $act['full'] ? 100 : [100, 50][$rank++] ?? 0;
                if ($taux === 0) {
                    continue;
                }
                $amount += $prices[$act['code']] * $act['coef'] * $taux / 100;
                $parts[] = $act['code'] . ' ' . self::number($act['coef']) . ($taux === 50 ? ' à 50 %' : '');
            }
            $majorations = array_map(static fn ($m): string => strtoupper(trim((string) $m)), is_array($passage['majorations'] ?? null) ? $passage['majorations'] : []);
            if ($home && !in_array('IFD', $majorations, true) && !in_array('IFI', $majorations, true)) {
                $majorations[] = 'IFD';
            }
            $single = count($acts) === 1 && $acts[0]['code'] === 'AMI' && $acts[0]['coef'] <= self::MAU_MAX_COEFFICIENT;
            $majorations = array_values(array_filter(array_unique($majorations), static fn (string $m): bool => $m !== 'MAU' && $m !== 'DIMANCHE_FERIE'));
            if ($single) {
                $majorations[] = 'MAU';
            }
            foreach ($majorations as $code) {
                if (!isset($prices[$code]) || in_array($code, self::ACT_CODES, true)) {
                    continue;
                }
                $amount += $prices[$code];
                $parts[] = self::short($code);
            }
            $amount = round($amount, 2);
            $day += $amount;
            $lines[] = ['passage' => $label, 'cotation' => implode(' + ', $parts), 'montant' => self::euros($amount)];
        }
        $day = round($day, 2);
        $sundays = (bool) ($input['dimanche_ferie'] ?? false);
        $sunday = round($day + ($sundays ? count($lines) * $prices['DIMANCHE_FERIE'] : 0), 2);
        $perWeek = max(1, min(7, (int) ($input['jours_par_semaine'] ?? 7)));
        $week = round($sundays && $perWeek === 7 ? 6 * $day + $sunday : $perWeek * $day, 2);

        $result = [
            'source' => $grid['source'] . ', en vigueur depuis le ' . date('d/m/Y', (int) strtotime((string) $grid['en_vigueur_depuis'])),
            'zone' => $zone === 'metropole' ? 'France métropolitaine' : 'Outre-mer et Mayotte',
            'passages' => $lines,
            'total_jour_semaine' => self::euros($day),
            'total_dimanche_ferie' => $sundays ? self::euros($sunday) . ' (majoration de ' . self::euros($prices['DIMANCHE_FERIE']) . ' par passage)' : 'pas de soins le dimanche',
            'total_semaine' => self::euros($week),
            'regles_appliquees' => 'cumul article 11B (2e acte à 50 %, suivants non facturés), IFD à chaque passage à domicile, MAU pour un acte unique en AMI ≤ 1,5',
            'hors' => 'indemnités kilométriques et jours fériés tombant en semaine',
        ];
        $days = (int) ($input['duree_jours'] ?? 0);
        if ($days > 0 && $days <= 366) {
            $start = AppTimezone::parseDateYmd((string) ($input['date_debut'] ?? '')) ?? AppTimezone::now();
            $sundayCount = 0;
            for ($d = 0; $d < $days; $d++) {
                if ($start->modify('+' . $d . ' day')->format('w') === '0') {
                    $sundayCount++;
                }
            }
            $total = $sundays ? ($days - $sundayCount) * $day + $sundayCount * $sunday : $days * $day;
            $result['total_duree'] = self::euros(round($total, 2)) . ' sur ' . $days . ' jours (' . $sundayCount . ' dimanche' . ($sundayCount > 1 ? 's' : '') . ', début le ' . $start->format('d/m/Y') . ')';
        }

        return $result;
    }

    private static function short(string $code): string
    {
        return match ($code) {
            'NUIT_20_23_5_8' => 'majoration nuit (20 h-23 h / 5 h-8 h)',
            'NUIT_23_5' => 'majoration nuit (23 h-5 h)',
            'IK_PLAINE', 'IK_MONTAGNE', 'IK_PIED_SKI' => 'IK',
            default => $code,
        };
    }

    private static function number(float $value): string
    {
        return rtrim(rtrim(number_format($value, 2, ',', ''), '0'), ',');
    }

    private static function euros(float $value): string
    {
        return number_format($value, 2, ',', ' ') . ' €';
    }

    /** @return array<string, mixed> */
    private static function tariffs(): array
    {
        if (self::$tariffs === null) {
            $data = self::available() ? json_decode((string) file_get_contents(self::TARIFFS), true) : null;
            self::$tariffs = is_array($data) ? $data : ['zones' => ['metropole' => []]];
        }

        return self::$tariffs;
    }
}

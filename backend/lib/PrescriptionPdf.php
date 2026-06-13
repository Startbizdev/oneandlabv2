<?php

/**
 * Génération de PDF d'ordonnance (médicale ou actes infirmiers).
 * Design Cary — HTML/CSS compatible Dompdf (tables, dimensions explicites).
 */

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/AppTimezone.php';

use Dompdf\Dompdf;
use Dompdf\Options;

class PrescriptionPdf
{
    private const BRAND_PRIMARY = '#1CC7B5';
    private const BRAND_PRIMARY_DARK = '#149E90';
    private const BRAND_TINT = '#E8FBF9';
    private const BRAND_TINT_BORDER = '#A8EFE8';
    private const CANVAS = '#F4FAFA';
    private const INK_PRIMARY = '#0F172A';
    private const INK_SECONDARY = '#475569';
    private const INK_MUTED = '#64748B';
    private const LINE = '#E2E8F0';
    private const NURSING_ACCENT = '#16B6D6';
    private const LOGO_TARGET_HEIGHT = 52;

    /**
     * @param array<string, mixed> $options kind: medical|nursing, prescription_number: string
     */
    public static function generate(array $prescriber, array $patient, string $prescriptionText, array $options = []): string
    {
        return self::renderToPdf($prescriber, $patient, $prescriptionText, $options);
    }

    /**
     * @param array<string, mixed> $options
     */
    private static function renderToPdf(
        array $prescriber,
        array $patient,
        string $prescriptionText,
        array $options
    ): string {
        $assetsDir = realpath(__DIR__ . '/../assets') ?: (__DIR__ . '/../assets');

        $dompdfOptions = new Options();
        $dompdfOptions->set('isRemoteEnabled', false);
        $dompdfOptions->set('isHtml5ParserEnabled', true);
        $dompdfOptions->set('defaultFont', 'DejaVu Sans');
        $dompdfOptions->setChroot([$assetsDir]);

        $dompdf = new Dompdf($dompdfOptions);

        $html = self::buildHtml($prescriber, $patient, $prescriptionText, $options);
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return $dompdf->output();
    }

    /**
     * @param array<string, mixed> $options
     */
    private static function buildHtml(
        array $prescriber,
        array $patient,
        string $prescriptionText,
        array $options
    ): string {
        $kind = ($options['kind'] ?? 'medical') === 'nursing' ? 'nursing' : 'medical';
        $accent = $kind === 'nursing' ? self::NURSING_ACCENT : self::BRAND_PRIMARY;
        $accentDark = $kind === 'nursing' ? '#0E9AB8' : self::BRAND_PRIMARY_DARK;
        $brandTint = self::BRAND_TINT;
        $brandTintBorder = self::BRAND_TINT_BORDER;
        $canvas = self::CANVAS;
        $inkPrimary = self::INK_PRIMARY;
        $inkSecondary = self::INK_SECONDARY;
        $inkMuted = self::INK_MUTED;
        $line = self::LINE;

        $prescriptionNumber = htmlspecialchars((string) ($options['prescription_number'] ?? ''));
        $prescriberName = htmlspecialchars(trim(($prescriber['first_name'] ?? '') . ' ' . ($prescriber['last_name'] ?? '')));
        $prescriberTitle = htmlspecialchars($prescriber['title'] ?? ($kind === 'nursing' ? 'Infirmier(ère)' : 'Dr'));
        $prescriberAddress = htmlspecialchars(self::formatAddress($prescriber['address'] ?? null));
        $prescriberRpps = htmlspecialchars(trim($prescriber['rpps'] ?? ''));
        $prescriberAdeli = htmlspecialchars(trim($prescriber['adeli'] ?? ''));

        $patientName = htmlspecialchars(trim(($patient['first_name'] ?? '') . ' ' . ($patient['last_name'] ?? '')));
        $patientBirthDate = htmlspecialchars(self::formatBirthDate($patient['birth_date'] ?? ''));
        $patientAddress = htmlspecialchars(self::formatAddress($patient['address'] ?? null));
        $patientNir = htmlspecialchars(trim((string) ($patient['nir'] ?? '')));

        $date = AppTimezone::displayDate();
        $prescriptionHtml = nl2br(htmlspecialchars($prescriptionText));

        $docTitle = $kind === 'nursing'
            ? 'Prescription d\'actes infirmiers'
            : 'Ordonnance médicale';

        $docSubtitle = $kind === 'nursing'
            ? 'Actes de soins — sans médicaments'
            : 'Prescription pharmaceutique';

        $idBlock = self::buildIdBlock($kind, $prescriberRpps, $prescriberAdeli);
        $nirRow = $patientNir !== ''
            ? "<tr><td class=\"label\">NIR</td><td class=\"value\">{$patientNir}</td></tr>"
            : '';

        $legalFooter = $kind === 'nursing'
            ? 'Ce document ne constitue pas une ordonnance de médicaments. Il porte exclusivement sur des actes de soins infirmiers conformément à la réglementation en vigueur.'
            : 'En cas de prescription de médicaments, la mention « Non substituable » doit figurer sur l\'ordonnance lorsque requise par la réglementation. Durée de validité conforme à la réglementation des ordonnances médicales.';

        $numberBadge = $prescriptionNumber !== ''
            ? "<span class=\"rx-badge\">N° {$prescriptionNumber}</span>"
            : '';

        $prescriberAddressRow = $prescriberAddress !== ''
            ? "<div class=\"meta-line\">{$prescriberAddress}</div>"
            : '';
        $patientAddressRow = $patientAddress !== ''
            ? "<tr><td class=\"label\">Adresse</td><td class=\"value\">{$patientAddress}</td></tr>"
            : '';

        $brandHeader = self::buildBrandHeaderHtml();
        $signatureBlock = self::buildSignatureCertificate(
            $prescriber,
            $patient,
            $prescriptionText,
            $kind,
            (string) ($options['prescription_number'] ?? '')
        );
        $footerSignNote = 'Document signé électroniquement via la plateforme Cary — horodatage certifié (heure de Paris).';

        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        @page { margin: 0; }
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 10pt;
            line-height: 1.45;
            color: {$inkPrimary};
            margin: 0;
            padding: 0;
        }
        .accent-bar { height: 4px; background: {$accent}; }
        .content { padding: 24px 40px 90px; }

        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
        .header-table td { vertical-align: middle; padding: 0; }
        .brand-cell { width: 58%; }
        .meta-cell { width: 42%; text-align: right; }
        .brand-name {
            font-size: 18pt;
            font-weight: bold;
            color: {$inkPrimary};
        }
        .brand-tagline {
            font-size: 7.5pt;
            color: {$inkMuted};
            letter-spacing: 0.3px;
            text-transform: uppercase;
            margin-top: 3px;
        }
        .meta-date { font-size: 9pt; color: {$inkSecondary}; margin-bottom: 4px; }
        .rx-badge {
            background: {$brandTint};
            border: 1px solid {$brandTintBorder};
            color: {$accentDark};
            font-size: 7.5pt;
            font-weight: bold;
            padding: 3px 9px;
        }

        .title-band {
            background: {$canvas};
            border: 1px solid {$line};
            border-left: 4px solid {$accent};
            padding: 12px 16px;
            margin-bottom: 18px;
        }
        .doc-title { font-size: 14pt; font-weight: bold; margin: 0 0 2px; }
        .doc-subtitle { font-size: 8.5pt; color: {$inkMuted}; margin: 0; }

        .parties-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
        .parties-table td { width: 50%; vertical-align: top; padding: 0 6px 0 0; }
        .parties-table td + td { padding: 0 0 0 6px; }
        .party-card { border: 1px solid {$line}; background: #fff; }
        .party-head {
            background: {$brandTint};
            border-bottom: 1px solid {$brandTintBorder};
            padding: 6px 12px;
            font-size: 7pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: {$accentDark};
        }
        .party-body { padding: 10px 12px 12px; }
        .party-name { font-size: 10.5pt; font-weight: bold; margin-bottom: 2px; }
        .party-role { font-size: 8pt; color: {$inkMuted}; margin-bottom: 6px; }
        .meta-line { font-size: 8.5pt; color: {$inkSecondary}; line-height: 1.35; }
        .id-chip {
            margin-top: 5px;
            background: {$canvas};
            border: 1px solid {$line};
            padding: 2px 7px;
            font-size: 7.5pt;
            color: {$inkSecondary};
        }
        .info-table { width: 100%; border-collapse: collapse; }
        .info-table td { padding: 2px 0; font-size: 8.5pt; vertical-align: top; }
        .info-table .label { width: 40%; color: {$inkMuted}; }
        .info-table .value { color: {$inkPrimary}; font-weight: bold; }

        .rx-section { margin-bottom: 16px; }
        .rx-head-table { width: 100%; border-collapse: collapse; border-bottom: 2px solid {$accent}; margin-bottom: 10px; }
        .rx-head-table td { padding: 0 0 5px; vertical-align: bottom; }
        .rx-label { font-size: 9.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.4px; }
        .rx-date { text-align: right; font-size: 8.5pt; color: {$inkMuted}; }
        .prescription-box {
            min-height: 140px;
            padding: 14px 16px;
            border: 1px solid {$line};
            border-left: 3px solid {$accent};
            font-size: 10.5pt;
            line-height: 1.5;
        }

        /* Certificat signature — compact DocuSign */
        .e-sign { border: 1px solid {$line}; margin-top: 18px; }
        .e-sign-bar {
            background: #ECFDF3;
            border-bottom: 1px solid #BBF7D0;
            padding: 5px 10px;
            font-size: 7.5pt;
            font-weight: bold;
            color: #166534;
        }
        .e-sign-grid { width: 100%; border-collapse: collapse; }
        .e-sign-grid td {
            padding: 3px 10px;
            font-size: 7.5pt;
            vertical-align: top;
            border-bottom: 1px solid {$line};
        }
        .e-sign-grid tr:last-child td { border-bottom: none; }
        .e-sign-grid .k { width: 22%; color: {$inkMuted}; }
        .e-sign-grid .v { width: 28%; color: {$inkPrimary}; font-weight: bold; }
        .e-sign-grid .v-mono {
            font-size: 6.5pt;
            font-weight: normal;
            letter-spacing: 0.15px;
            line-height: 1.35;
            word-wrap: break-word;
        }

        .page-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 10px 40px 14px;
            border-top: 1px solid {$line};
            background: #fff;
            text-align: center;
        }
        .footer-legal {
            font-size: 6.5pt;
            color: {$inkMuted};
            line-height: 1.45;
            margin: 0 auto 5px;
            max-width: 460px;
            text-align: center;
        }
        .footer-sign {
            font-size: 6.5pt;
            color: {$inkSecondary};
            line-height: 1.4;
            margin: 0 auto 5px;
            max-width: 460px;
            text-align: center;
        }
        .footer-brand { font-size: 6.5pt; color: #94A3B8; margin: 0; text-align: center; }
        .footer-brand strong { color: {$accentDark}; }
    </style>
</head>
<body>
<div class="accent-bar"></div>
<div class="content">
    <table class="header-table">
        <tr>
            <td class="brand-cell">
                {$brandHeader}
                <div class="brand-tagline">Santé à domicile — document officiel</div>
            </td>
            <td class="meta-cell">
                <div class="meta-date">Émis le {$date}</div>
                {$numberBadge}
            </td>
        </tr>
    </table>

    <div class="title-band">
        <div class="doc-title">{$docTitle}</div>
        <div class="doc-subtitle">{$docSubtitle}</div>
    </div>

    <table class="parties-table">
        <tr>
            <td>
                <div class="party-card">
                    <div class="party-head">Prescripteur</div>
                    <div class="party-body">
                        <div class="party-name">{$prescriberTitle} {$prescriberName}</div>
                        <div class="party-role">Professionnel de santé</div>
                        {$prescriberAddressRow}
                        {$idBlock}
                    </div>
                </div>
            </td>
            <td>
                <div class="party-card">
                    <div class="party-head">Patient</div>
                    <div class="party-body">
                        <table class="info-table">
                            <tr><td class="label">Nom</td><td class="value">{$patientName}</td></tr>
                            <tr><td class="label">Date de naissance</td><td class="value">{$patientBirthDate}</td></tr>
                            {$nirRow}
                            {$patientAddressRow}
                        </table>
                    </div>
                </div>
            </td>
        </tr>
    </table>

    <div class="rx-section">
        <table class="rx-head-table">
            <tr>
                <td class="rx-label">Prescription</td>
                <td class="rx-date">Date : {$date}</td>
            </tr>
        </table>
        <div class="prescription-box">{$prescriptionHtml}</div>
    </div>

    {$signatureBlock}
</div>

<div class="page-footer">
    <p class="footer-sign">{$footerSignNote}</p>
    <p class="footer-legal">{$legalFooter}</p>
    <p class="footer-brand">Document généré via <strong>Cary</strong> · Données de santé hébergées HDS · cary.bio</p>
</div>
</body>
</html>
HTML;
    }

    private static function buildBrandHeaderHtml(): string
    {
        $logo = self::buildLogoImgTag();
        if ($logo !== null) {
            return $logo;
        }

        return '<div class="brand-name">Cary</div>';
    }

    private static function buildLogoImgTag(): ?string
    {
        $logo = self::resolveLogoBinary();
        if ($logo === null) {
            return null;
        }

        [$bytes, $mime, $srcW, $srcH] = $logo;
        $targetH = self::LOGO_TARGET_HEIGHT;
        $targetW = max(1, (int) round($srcW * ($targetH / $srcH)));

        // Data-URI : méthode fiable Dompdf (pas de résolution chroot/chemin relatif).
        $dataUri = 'data:' . $mime . ';base64,' . base64_encode($bytes);

        return '<img src="' . $dataUri . '"'
            . ' width="' . $targetW . '" height="' . $targetH . '" alt="Cary" />';
    }

    /**
     * @return array{0: string, 1: string, 2: int, 3: int}|null [bytes, mime, width, height]
     */
    private static function resolveLogoBinary(): ?array
    {
        $assetsDir = realpath(__DIR__ . '/../assets') ?: (__DIR__ . '/../assets');
        $jpgPath = $assetsDir . '/logo-cary.jpg';

        if (is_readable($jpgPath)) {
            $info = @getimagesize($jpgPath);
            if ($info !== false && ($info[2] ?? 0) === IMAGETYPE_JPEG) {
                $bytes = @file_get_contents($jpgPath);
                if ($bytes !== false && $bytes !== '') {
                    return [$bytes, 'image/jpeg', (int) $info[0], (int) $info[1]];
                }
            }
        }

        $pngPath = $assetsDir . '/logo-cary.png';
        if (!is_readable($pngPath) || !function_exists('imagecreatefrompng')) {
            return null;
        }

        $jpegBytes = self::convertPngFileToJpegBytes($pngPath);
        if ($jpegBytes === null) {
            return null;
        }

        $info = @getimagesizefromstring($jpegBytes);
        if ($info === false) {
            return null;
        }

        return [$jpegBytes, 'image/jpeg', (int) $info[0], (int) $info[1]];
    }

    private static function convertPngFileToJpegBytes(string $pngPath): ?string
    {
        if (!function_exists('imagecreatefrompng') || !function_exists('imagejpeg')) {
            return null;
        }

        $image = @imagecreatefrompng($pngPath);
        if ($image === false) {
            return null;
        }

        $width = imagesx($image);
        $height = imagesy($image);
        if ($width <= 0 || $height <= 0) {
            imagedestroy($image);

            return null;
        }

        $canvas = imagecreatetruecolor($width, $height);
        if ($canvas === false) {
            imagedestroy($image);

            return null;
        }

        $white = imagecolorallocate($canvas, 255, 255, 255);
        imagefill($canvas, 0, 0, $white);
        imagecopy($canvas, $image, 0, 0, 0, 0, $width, $height);
        imagedestroy($image);

        ob_start();
        $ok = imagejpeg($canvas, null, 92);
        imagedestroy($canvas);
        $jpeg = ob_get_clean();

        return ($ok && is_string($jpeg) && $jpeg !== '') ? $jpeg : null;
    }

    private static function buildIdBlock(string $kind, string $rpps, string $adeli): string
    {
        $chips = [];
        if ($kind === 'nursing') {
            if ($adeli !== '') {
                $chips[] = 'ADELI ' . $adeli;
            }
        } else {
            if ($rpps !== '') {
                $chips[] = 'RPPS ' . $rpps;
            }
            if ($adeli !== '') {
                $chips[] = 'ADELI ' . $adeli;
            }
        }
        if ($chips === []) {
            return '';
        }

        return '<div class="id-chip">' . htmlspecialchars(implode(' · ', $chips)) . '</div>';
    }

    /**
     * @param array<string, mixed> $prescriber
     * @param array<string, mixed> $patient
     */
    private static function buildSignatureCertificate(
        array $prescriber,
        array $patient,
        string $prescriptionText,
        string $kind,
        string $prescriptionNumber
    ): string {
        $now = AppTimezone::now();
        $displayTimestamp = AppTimezone::displayDateTime($now);
        $isoTimestamp = AppTimezone::iso8601($now);
        $tzLabel = AppTimezone::tzAbbrev($now);

        $prescriberName = trim(($prescriber['first_name'] ?? '') . ' ' . ($prescriber['last_name'] ?? ''));
        $prescriberTitle = trim((string) ($prescriber['title'] ?? ($kind === 'nursing' ? 'Infirmier(ère)' : 'Dr')));
        $rpps = trim((string) ($prescriber['rpps'] ?? ''));
        $adeli = trim((string) ($prescriber['adeli'] ?? ''));

        $idLine = $kind === 'nursing'
            ? ($adeli !== '' ? 'ADELI ' . $adeli : '—')
            : (trim(($rpps !== '' ? 'RPPS ' . $rpps : '') . ($adeli !== '' ? ($rpps !== '' ? ' · ADELI ' : 'ADELI ') . $adeli : '')) ?: '—');

        $fingerprint = self::computeDocumentFingerprint(
            $prescriber,
            $patient,
            $prescriptionText,
            $kind,
            $prescriptionNumber,
            $now
        );
        $signatureRef = self::signatureReference($fingerprint);
        $fingerprintDisplay = self::formatSha256Display($fingerprint);

        $esc = static fn (string $s): string => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');

        $bar = $esc('Document signé électroniquement — ' . $displayTimestamp . ' (heure de Paris, ' . $tzLabel . ')');

        $docRow = $prescriptionNumber !== ''
            ? '<tr><td class="k">N° ordonnance</td><td class="v" colspan="3">' . $esc($prescriptionNumber) . '</td></tr>'
            : '';

        return '<div class="e-sign">'
            . '<div class="e-sign-bar">' . $bar . '</div>'
            . '<table class="e-sign-grid">'
            . '<tr>'
            . '<td class="k">Signataire</td><td class="v">' . $esc($prescriberTitle . ' ' . $prescriberName) . '</td>'
            . '<td class="k">Identifiant pro</td><td class="v">' . $esc($idLine) . '</td>'
            . '</tr>'
            . $docRow
            . '<tr>'
            . '<td class="k">Horodatage</td><td class="v" colspan="3">'
            . $esc($displayTimestamp . ' (heure de Paris, ' . $tzLabel . ')')
            . '</td></tr>'
            . '<tr>'
            . '<td class="k">Horodatage ISO 8601</td><td class="v v-mono" colspan="3">' . $esc($isoTimestamp) . '</td>'
            . '</tr>'
            . '<tr>'
            . '<td class="k">Référence de signature</td><td class="v">' . $esc($signatureRef) . '</td>'
            . '<td class="k">Algorithme</td><td class="v">SHA-256</td>'
            . '</tr>'
            . '<tr>'
            . '<td class="k">Empreinte numérique</td>'
            . '<td class="v v-mono" colspan="3">' . $esc($fingerprintDisplay) . '</td>'
            . '</tr>'
            . '</table>'
            . '</div>';
    }

    /**
     * @param array<string, mixed> $prescriber
     * @param array<string, mixed> $patient
     */
    private static function computeDocumentFingerprint(
        array $prescriber,
        array $patient,
        string $prescriptionText,
        string $kind,
        string $prescriptionNumber,
        \DateTimeImmutable $signedAt
    ): string {
        $payload = json_encode([
            'kind' => $kind,
            'prescription_number' => $prescriptionNumber,
            'signed_at' => AppTimezone::iso8601($signedAt),
            'prescriber' => [
                'first_name' => trim((string) ($prescriber['first_name'] ?? '')),
                'last_name' => trim((string) ($prescriber['last_name'] ?? '')),
                'title' => trim((string) ($prescriber['title'] ?? '')),
                'rpps' => trim((string) ($prescriber['rpps'] ?? '')),
                'adeli' => trim((string) ($prescriber['adeli'] ?? '')),
            ],
            'patient' => [
                'first_name' => trim((string) ($patient['first_name'] ?? '')),
                'last_name' => trim((string) ($patient['last_name'] ?? '')),
                'birth_date' => trim((string) ($patient['birth_date'] ?? '')),
            ],
            'prescription_text' => $prescriptionText,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        return hash('sha256', $payload !== false ? $payload : '');
    }

    private static function signatureReference(string $fingerprint): string
    {
        return 'SIG-' . strtoupper(substr($fingerprint, 0, 8));
    }

    private static function formatSha256Display(string $fingerprint): string
    {
        $normalized = strtoupper(preg_replace('/\s+/', '', $fingerprint) ?? $fingerprint);

        return implode(' ', str_split($normalized, 8));
    }

    private static function formatBirthDate(string $raw): string
    {
        $raw = trim($raw);
        if ($raw === '') {
            return '—';
        }
        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $raw, $m)) {
            return $m[3] . '/' . $m[2] . '/' . $m[1];
        }

        return $raw;
    }

    private static function formatAddress($address): string
    {
        if (empty($address)) {
            return '';
        }
        if (is_string($address)) {
            $decoded = json_decode($address, true);
            if (is_array($decoded) && isset($decoded['label'])) {
                return (string) $decoded['label'];
            }

            return $address;
        }
        if (is_array($address) && isset($address['label'])) {
            return (string) $address['label'];
        }

        return '';
    }
}

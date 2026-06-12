<?php

/**
 * Génération de PDF d'ordonnance (médicale ou actes infirmiers).
 */

require_once __DIR__ . '/../vendor/autoload.php';

use Dompdf\Dompdf;
use Dompdf\Options;

class PrescriptionPdf
{
    /**
     * @param array<string, mixed> $options kind: medical|nursing, prescription_number: string
     */
    public static function generate(array $prescriber, array $patient, string $prescriptionText, array $options = []): string
    {
        $dompdfOptions = new Options();
        $dompdfOptions->set('isRemoteEnabled', false);
        $dompdfOptions->set('isHtml5ParserEnabled', true);
        $dompdfOptions->set('defaultFont', 'DejaVu Sans');

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
    private static function buildHtml(array $prescriber, array $patient, string $prescriptionText, array $options = []): string
    {
        $kind = ($options['kind'] ?? 'medical') === 'nursing' ? 'nursing' : 'medical';
        $prescriptionNumber = htmlspecialchars((string) ($options['prescription_number'] ?? ''));

        $prescriberName = htmlspecialchars(trim(($prescriber['first_name'] ?? '') . ' ' . ($prescriber['last_name'] ?? '')));
        $prescriberTitle = htmlspecialchars($prescriber['title'] ?? ($kind === 'nursing' ? 'Infirmier(ère)' : 'Dr'));
        $prescriberAddress = htmlspecialchars(self::formatAddress($prescriber['address'] ?? null));
        $prescriberRpps = htmlspecialchars($prescriber['rpps'] ?? '');
        $prescriberAdeli = htmlspecialchars($prescriber['adeli'] ?? '');

        $patientName = htmlspecialchars(trim(($patient['first_name'] ?? '') . ' ' . ($patient['last_name'] ?? '')));
        $patientBirthDate = htmlspecialchars($patient['birth_date'] ?? '');
        $patientAddress = htmlspecialchars(self::formatAddress($patient['address'] ?? null));
        $patientNir = htmlspecialchars(trim((string) ($patient['nir'] ?? '')));

        $date = date('d/m/Y');
        $signedAt = date('d/m/Y à H:i');
        $prescriptionHtml = nl2br(htmlspecialchars($prescriptionText));

        $docTitle = $kind === 'nursing'
            ? 'Prescription d\'actes infirmiers'
            : 'Ordonnance';

        $idLine = $kind === 'nursing'
            ? "ADELI : {$prescriberAdeli}"
            : "RPPS : {$prescriberRpps}" . ($prescriberAdeli !== '' ? " | ADELI : {$prescriberAdeli}" : '');

        $professionLine = $kind === 'nursing'
            ? 'Profession réglementée — Infirmier(ère)'
            : 'Profession réglementée — ' . $prescriberTitle;

        $nirLine = $patientNir !== '' ? "<div>NIR : {$patientNir}</div>" : '';

        $legalFooter = $kind === 'nursing'
            ? '<p>Ce document ne constitue pas une ordonnance de médicaments. Il porte exclusivement sur des actes de soins infirmiers.</p>'
            : '<p>En cas de prescription de médicaments, la mention « Non substituable » doit figurer sur l\'ordonnance lorsque requise par la réglementation.</p>';

        $validityLine = $kind === 'medical'
            ? '<p>Durée de validité : conformément à la réglementation en vigueur pour les ordonnances médicales.</p>'
            : '';

        $numberLine = $prescriptionNumber !== ''
            ? "<div class=\"rx-number\">N° {$prescriptionNumber}</div>"
            : '';

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11pt; line-height: 1.4; color: #333; margin: 40px; }
        .header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #ccc; }
        .doc-title { font-size: 14pt; font-weight: bold; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .prescriber { font-weight: bold; font-size: 12pt; }
        .profession { font-size: 10pt; color: #555; margin-top: 4px; }
        .section-title { font-weight: bold; margin-top: 20px; margin-bottom: 8px; font-size: 11pt; }
        .prescription { margin-top: 16px; padding: 12px; background: #f9f9f9; border-radius: 4px; white-space: pre-wrap; min-height: 120px; }
        .signature { margin-top: 40px; text-align: right; font-size: 10pt; }
        .signature-line { margin-top: 48px; border-top: 1px solid #999; width: 220px; margin-left: auto; padding-top: 6px; }
        .footer { margin-top: 32px; font-size: 8pt; color: #666; border-top: 1px solid #ddd; padding-top: 12px; }
        .rx-number { font-size: 9pt; color: #666; margin-bottom: 8px; }
    </style>
</head>
<body>
    {$numberLine}
    <div class="doc-title">{$docTitle}</div>

    <div class="header">
        <div class="prescriber">{$prescriberTitle} {$prescriberName}</div>
        <div class="profession">{$professionLine}</div>
        <div>{$prescriberAddress}</div>
        <div>{$idLine}</div>
    </div>

    <div class="section-title">Patient</div>
    <div>Nom : {$patientName}</div>
    <div>Date de naissance : {$patientBirthDate}</div>
    {$nirLine}
    <div>Adresse : {$patientAddress}</div>

    <div class="section-title">Prescription</div>
    <div>Date : {$date}</div>
    <div class="prescription">{$prescriptionHtml}</div>

    <div class="signature">
        <div>Signé électroniquement le {$signedAt}</div>
        <div class="signature-line">{$prescriberName}</div>
    </div>

    <div class="footer">
        {$legalFooter}
        {$validityLine}
        <p>Document généré via Cary — Données de santé hébergées conformément aux exigences HDS.</p>
    </div>
</body>
</html>
HTML;
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

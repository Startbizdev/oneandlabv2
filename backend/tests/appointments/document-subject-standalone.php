<?php
declare(strict_types=1);
require_once __DIR__ . '/../../lib/MedicalDocumentSubject.php';
$cases = [
    ['patient-a', null, 'patient-a', null, true],
    ['patient-a', '', 'patient-a', null, true],
    ['patient-a', 'child-a', 'patient-a', 'child-a', true],
    ['patient-a', 'child-a', 'patient-a', null, false],
    ['patient-a', null, 'patient-a', 'child-a', false],
    ['patient-a', 'child-a', 'patient-a', 'child-b', false],
    ['patient-a', null, 'patient-b', null, false],
    [null, null, null, null, false],
];
foreach ($cases as [$sourcePatient, $sourceRelative, $targetPatient, $targetRelative, $expected]) {
    if (MedicalDocumentSubject::matches($sourcePatient, $sourceRelative, $targetPatient, $targetRelative) !== $expected) {
        throw new RuntimeException('Document subject isolation failed');
    }
}
echo count($cases) . " document subject isolation checks passed\n";

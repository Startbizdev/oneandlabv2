#!/usr/bin/env php
<?php
$email = $argv[1] ?? 'charle.barth@test.oneandlab.fr';
$base = 'https://cary.bio/api';
$backendDir = dirname(__DIR__);
$cf = sys_get_temp_dir() . '/debug-draft.cook';
@unlink($cf);

exec('cd ' . escapeshellarg($backendDir) . ' && php get-last-otp.php ' . escapeshellarg($email) . ' 2>&1', $o);
$t = implode("\n", $o);
preg_match('/User ID:\s*(\S+)/', $t, $m);
$uid = trim($m[1] ?? '');
preg_match('/Code OTP:\s*(\d{6})/', $t, $m);
$otp = $m[1] ?? '';

function cj($u, $h = [], $b = null, $m = 'GET') {
    global $cf;
    $ch = curl_init($u);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $m,
        CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $h),
        CURLOPT_COOKIEJAR => $cf,
        CURLOPT_COOKIEFILE => $cf,
        CURLOPT_TIMEOUT => 60,
    ]);
    if ($b) curl_setopt($ch, CURLOPT_POSTFIELDS, $b);
    $r = curl_exec($ch);
    $c = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$c, $r];
}

[, $r] = cj("$base/auth/csrf-token");
$csrf = json_decode($r, true)['data']['csrf_token'] ?? null;
[, $r] = cj("$base/auth/verify-otp", [], json_encode(['user_id' => $uid, 'otp' => $otp]), 'POST');
$tok = json_decode($r, true)['token'] ?? null;
$h = ["Authorization: Bearer $tok", "X-CSRF-Token: $csrf"];
[$c, $r] = cj("$base/ai/booking/drafts", $h, json_encode([
    'payload' => [
        'type' => 'blood_test',
        'form_type' => 'blood_test',
        'patient_mode' => 'self',
        'patient_id' => $uid,
    ],
]), 'POST');
echo "HTTP $c\n$r\n";

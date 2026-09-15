<?php
// CLI-only deployment audit and backup. Never prints credentials or clinical rows.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$config = require '/var/www/oneandlab/backend/config/database.php';
$db = new PDO(sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $config['host'], $config['port'], $config['database']), $config['username'], $config['password'], $config['options']);
$mode = $argv[1] ?? 'audit';
$tables = $db->query('SELECT TABLE_NAME, ENGINE, DATA_LENGTH+INDEX_LENGTH AS bytes FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE="BASE TABLE"')->fetchAll();
$counts = [];
foreach ($tables as $table) {
    $name = $table['TABLE_NAME'];
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $name)) throw new RuntimeException('Unexpected table name');
    $counts[$name] = (int)$db->query("SELECT COUNT(*) FROM `$name`")->fetchColumn();
}
$columns = $db->query("SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND ((TABLE_NAME='medical_documents' AND COLUMN_NAME='document_type') OR (TABLE_NAME='appointments' AND COLUMN_NAME IN ('lab_preference_mode','preferred_lab_brand_id','passage_series_id'))) ")->fetchAll();
if ($mode === 'audit') { echo json_encode(['tables'=>count($tables),'bytes'=>array_sum(array_column($tables,'bytes')),'non_innodb'=>array_values(array_filter($tables,fn($t)=>$t['ENGINE']!=='InnoDB')),'conversation_table'=>isset($counts['appointment_conversation_messages']),'creation_table'=>isset($counts['appointment_creation_requests']),'columns'=>$columns],JSON_PRETTY_PRINT).PHP_EOL; exit; }
$dir = $argv[2] ?? '';
if (!preg_match('~^/home/ubuntu/deploy-backups/[a-zA-Z0-9_-]+$~', $dir)) throw new RuntimeException('Invalid backup directory');
if ($mode === 'backup') {
    if (array_filter($tables,fn($t)=>$t['ENGINE']!=='InnoDB')) throw new RuntimeException('Nontransactional table requires another backup strategy');
    if (!is_dir($dir) && !mkdir($dir,0700,true)) throw new RuntimeException('Cannot create backup directory');
    chmod($dir,0700);
    $ini = tempnam($dir,'mysql-'); chmod($ini,0600);
    $quote = static fn($s) => '"'.str_replace(['\\','"',"\n","\r"],['\\\\','\\"','\\n','\\r'],(string)$s).'"';
    file_put_contents($ini,"[client]\nhost=".$quote($config['host'])."\nport=".(int)$config['port']."\nuser=".$quote($config['username'])."\npassword=".$quote($config['password'])."\n");
    $dump = $dir.'/database.sql.gz';
    try {
        $command='mysqldump --defaults-extra-file='.escapeshellarg($ini).' --single-transaction --quick --hex-blob --routines --triggers --events --no-tablespaces '.escapeshellarg($config['database']).' | gzip -c > '.escapeshellarg($dump);
        passthru('bash -o pipefail -c '.escapeshellarg($command),$code);
        if ($code!==0) throw new RuntimeException('Database dump failed');
        chmod($dump,0600);
        exec('gzip -t '.escapeshellarg($dump),$unused,$gzipCode);
        if ($gzipCode!==0 || filesize($dump)<100) throw new RuntimeException('Invalid compressed dump');
        file_put_contents($dir.'/counts-before.json',json_encode($counts,JSON_PRETTY_PRINT));
        file_put_contents($dir.'/database.sha256',hash_file('sha256',$dump)."  database.sql.gz\n");
        echo json_encode(['backup'=>$dump,'bytes'=>filesize($dump),'tables'=>count($counts),'gzip_verified'=>true]).PHP_EOL;
    } finally { unlink($ini); }
} elseif ($mode === 'migrate') {
    $dump = $dir . '/database.sql.gz';
    if (!is_file($dump) || !is_file($dir . '/database.sha256')) throw new RuntimeException('Verified backup required');
    $expected = explode(' ', trim(file_get_contents($dir . '/database.sha256')))[0];
    if (!hash_equals($expected, hash_file('sha256', $dump))) throw new RuntimeException('Backup checksum mismatch');
    // Only the missing additive migration; never replay historical UPDATE migrations.
    $db->exec('CREATE TABLE IF NOT EXISTS appointment_creation_requests (
        actor_id VARCHAR(36) NOT NULL, request_key VARCHAR(64) NOT NULL,
        request_hash CHAR(64) NOT NULL, appointment_id VARCHAR(36) NULL,
        response_completed TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (actor_id, request_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin');
    $actual = $db->query('SHOW COLUMNS FROM appointment_creation_requests')->fetchAll(PDO::FETCH_COLUMN);
    if ($actual !== ['actor_id','request_key','request_hash','appointment_id','response_completed','created_at']) throw new RuntimeException('Unexpected idempotency schema');
    echo "Migration 107 verified; no existing records modified.\n";

    $transportCol = $db->query("SHOW COLUMNS FROM voice_sessions LIKE 'transport'")->fetch(PDO::FETCH_ASSOC);
    if ($transportCol === false) {
        $db->exec("ALTER TABLE voice_sessions
            ADD COLUMN transport ENUM('rest', 'realtime') NOT NULL DEFAULT 'rest' AFTER channel,
            ADD COLUMN xai_conversation_id VARCHAR(128) NULL AFTER ai_conversation_id,
            ADD COLUMN token_expires_at DATETIME NULL AFTER ended_at,
            ADD COLUMN last_event_id VARCHAR(128) NULL AFTER token_expires_at");
        echo "Migration 108 applied: voice_sessions realtime columns.\n";
    } else {
        echo "Migration 108 verified: voice_sessions.transport present.\n";
    }

    $db->exec('CREATE TABLE IF NOT EXISTS voice_realtime_events (
        id CHAR(36) PRIMARY KEY,
        session_id CHAR(36) NOT NULL,
        event_id VARCHAR(128) NOT NULL,
        event_type VARCHAR(64) NOT NULL,
        payload_json JSON NULL,
        latency_ms INT UNSIGNED NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_voice_rt_event (session_id, event_id),
        KEY idx_voice_rt_session (session_id, created_at),
        CONSTRAINT fk_voice_rt_session FOREIGN KEY (session_id) REFERENCES voice_sessions(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
    echo "Migration 108 verified: voice_realtime_events table.\n";
} elseif ($mode === 'verify') {
    $before=json_decode(file_get_contents($dir.'/counts-before.json'),true,512,JSON_THROW_ON_ERROR);
    $missing=array_diff_key($before,$counts);
    if ($missing) throw new RuntimeException('An original table is missing');
    $decreased=[]; foreach($before as $name=>$n) if($counts[$name]<$n) $decreased[$name]=[$n,$counts[$name]];
    file_put_contents($dir.'/counts-after.json',json_encode($counts,JSON_PRETTY_PRINT));
    echo json_encode(['original_tables_present'=>true,'row_count_decreases'=>$decreased,'creation_table'=>isset($counts['appointment_creation_requests'])]).PHP_EOL;
    if($decreased) exit(2);
} else { throw new RuntimeException('Unknown mode'); }

-- Script SQL pour vérifier les sessions OTP dans la base de données
-- Usage: mysql -u root -p oneandlab < check-otp-db.sql

SET @email = 'joopixstudio@gmail.com';
SET @email_hash = SHA2(LOWER(@email), 256);

-- 1. Trouver l'utilisateur
SELECT 
    '=== UTILISATEUR ===' AS info;
    
SELECT 
    id,
    email_hash,
    role,
    banned_until,
    created_at
FROM profiles
WHERE email_hash = @email_hash;

-- 2. Vérifier les sessions OTP pour cet utilisateur
SELECT 
    '=== SESSIONS OTP ===' AS info;

SELECT 
    os.id,
    os.user_id,
    os.expires_at,
    os.verified,
    os.created_at,
    TIMESTAMPDIFF(SECOND, NOW(), os.expires_at) AS seconds_until_expiry,
    CASE 
        WHEN os.expires_at < NOW() THEN 'EXPIRÉ'
        WHEN os.verified = TRUE THEN 'DÉJÀ VÉRIFIÉE'
        ELSE 'VALIDE'
    END AS status
FROM otp_sessions os
INNER JOIN profiles p ON os.user_id = p.id
WHERE p.email_hash = @email_hash
ORDER BY os.created_at DESC
LIMIT 10;

-- 3. Compter les sessions par statut
SELECT 
    '=== STATISTIQUES ===' AS info;

SELECT 
    COUNT(*) AS total_sessions,
    SUM(CASE WHEN verified = TRUE THEN 1 ELSE 0 END) AS verified_count,
    SUM(CASE WHEN verified = FALSE AND expires_at > NOW() THEN 1 ELSE 0 END) AS valid_unverified_count,
    SUM(CASE WHEN expires_at < NOW() THEN 1 ELSE 0 END) AS expired_count
FROM otp_sessions os
INNER JOIN profiles p ON os.user_id = p.id
WHERE p.email_hash = @email_hash;





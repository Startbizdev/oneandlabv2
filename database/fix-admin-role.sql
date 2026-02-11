-- Corriger le rôle de admin@test.com en super_admin
-- email_hash = SHA2(LOWER('admin@test.com'), 256)
UPDATE profiles
SET role = 'super_admin'
WHERE email_hash = 'e95ebd623fa6a2dfade14ac2559bfc3874fd850b5210e33f57469559ad24b2fa'
  AND role != 'super_admin';

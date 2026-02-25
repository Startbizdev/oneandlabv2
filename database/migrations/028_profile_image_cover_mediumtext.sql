-- Migration 028 : Agrandir profile_image_url et cover_image_url pour accepter les data URLs base64
-- (VARCHAR(500) provoquait "Data too long" lors de l'enregistrement d'images en base64)

SET @dbname = DATABASE();
SET @tablename = "profiles";

-- profile_image_url : VARCHAR(500) -> MEDIUMTEXT
ALTER TABLE profiles MODIFY COLUMN profile_image_url MEDIUMTEXT NULL;

-- cover_image_url : VARCHAR(500) -> MEDIUMTEXT
ALTER TABLE profiles MODIFY COLUMN cover_image_url MEDIUMTEXT NULL;

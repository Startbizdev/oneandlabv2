-- Redirections 301 : ancien slug -> profil (pour lab/subaccount quand le nom change)
-- GET /Laboratoire/ancien-slug renvoie redirect + new_slug, le front fait 301 vers /Laboratoire/nouveau-slug

CREATE TABLE IF NOT EXISTS slug_redirects (
  old_slug VARCHAR(255) NOT NULL,
  profile_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (old_slug),
  KEY idx_profile_id (profile_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

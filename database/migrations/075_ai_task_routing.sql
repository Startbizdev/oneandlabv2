-- Migration 075 : routing IA par type de tâche + paramètres plateforme

CREATE TABLE IF NOT EXISTS platform_settings (
    setting_key VARCHAR(64) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO platform_settings (setting_key, setting_value) VALUES
    ('ai_disclaimer_fr', 'Cary est un assistant informatif. Il ne remplace pas un avis médical. En cas d''urgence, contactez le 15 ou le 112.'),
    ('ai_temperature', '0.4')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

CREATE TABLE IF NOT EXISTS ai_task_routing (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_type VARCHAR(64) NOT NULL,
    provider ENUM('grok','deepseek','openai','claude','gemini','local') NOT NULL DEFAULT 'grok',
    model VARCHAR(64) NULL,
    priority INT NOT NULL DEFAULT 0,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE KEY uq_ai_task_routing_type (task_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO ai_task_routing (task_type, provider, model, priority, enabled) VALUES
    ('chat_simple', 'grok', 'grok-3', 0, 1),
    ('chat_complex', 'grok', 'grok-3', 0, 1),
    ('medical_summary', 'grok', 'grok-3', 0, 1),
    ('document_analysis', 'grok', 'grok-3', 0, 1),
    ('ocr', 'grok', 'grok-3', 0, 1),
    ('voice_agent', 'grok', 'grok-3', 0, 1),
    ('voice_transcription', 'grok', 'grok-3', 0, 1),
    ('trend_wording', 'grok', 'grok-3', 0, 1),
    ('appointment_suggestion', 'grok', 'grok-3', 0, 1)
ON DUPLICATE KEY UPDATE provider = VALUES(provider), model = VALUES(model), enabled = VALUES(enabled);

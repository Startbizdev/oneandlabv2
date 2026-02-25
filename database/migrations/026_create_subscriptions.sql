-- Migration 026 : Abonnements Stripe (infirmiers et laboratoires)
CREATE TABLE IF NOT EXISTS subscriptions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    stripe_customer_id VARCHAR(255) NULL,
    stripe_subscription_id VARCHAR(255) NULL,
    price_id VARCHAR(255) NULL,
    plan_slug VARCHAR(64) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'incomplete',
    trial_ends_at DATETIME NULL,
    current_period_end DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_stripe_subscription (stripe_subscription_id),
    INDEX idx_user_id (user_id),
    INDEX idx_stripe_customer_id (stripe_customer_id),
    INDEX idx_status (status),
    INDEX idx_plan_slug (plan_slug),

    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

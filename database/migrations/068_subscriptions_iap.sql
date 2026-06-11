-- Migration 068 : abonnements Apple / Google (IAP mobile) en plus de Stripe

ALTER TABLE subscriptions
    ADD COLUMN billing_source VARCHAR(16) NOT NULL DEFAULT 'stripe' AFTER user_id,
    ADD COLUMN store_product_id VARCHAR(128) NULL AFTER price_id,
    ADD COLUMN store_original_transaction_id VARCHAR(255) NULL AFTER store_product_id;

ALTER TABLE subscriptions
    MODIFY COLUMN stripe_subscription_id VARCHAR(255) NULL;

CREATE UNIQUE INDEX uq_subscriptions_store_original_tx
    ON subscriptions (store_original_transaction_id);

CREATE INDEX idx_subscriptions_billing_source ON subscriptions (billing_source);

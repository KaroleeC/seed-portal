BEGIN;

-- ===== pricing_base (update then insert if missing) =====
UPDATE pricing_base SET base_fee = 150, description = 'Base bookkeeping monthly', updated_at = NOW() WHERE service = 'bookkeeping';
INSERT INTO pricing_base (service, base_fee, description)
SELECT 'bookkeeping', 150, 'Base bookkeeping monthly'
WHERE NOT EXISTS (SELECT 1 FROM pricing_base WHERE service = 'bookkeeping');

UPDATE pricing_base SET base_fee = 150, description = 'Base TaaS monthly', updated_at = NOW() WHERE service = 'taas';
INSERT INTO pricing_base (service, base_fee, description)
SELECT 'taas', 150, 'Base TaaS monthly'
WHERE NOT EXISTS (SELECT 1 FROM pricing_base WHERE service = 'taas');

UPDATE pricing_base SET base_fee = 100, description = 'Base payroll monthly', updated_at = NOW() WHERE service = 'payroll';
INSERT INTO pricing_base (service, base_fee, description)
SELECT 'payroll', 100, 'Base payroll monthly'
WHERE NOT EXISTS (SELECT 1 FROM pricing_base WHERE service = 'payroll');

UPDATE pricing_base SET base_fee = 150, description = 'Base Agent of Service monthly', updated_at = NOW() WHERE service = 'agent_of_service';
INSERT INTO pricing_base (service, base_fee, description)
SELECT 'agent_of_service', 150, 'Base Agent of Service monthly'
WHERE NOT EXISTS (SELECT 1 FROM pricing_base WHERE service = 'agent_of_service');

-- ===== pricing_industry_multipliers (ON CONFLICT update) =====
INSERT INTO pricing_industry_multipliers (industry, monthly_multiplier, cleanup_multiplier)
VALUES
('Software/SaaS', 1.0, 1.0),
('Professional Services', 1.0, 1.1),
('Consulting', 1.0, 1.05),
('Healthcare/Medical', 1.4, 1.3),
('Real Estate', 1.25, 1.05),
('Property Management', 1.3, 1.2),
('E-commerce/Retail', 1.35, 1.15),
('Restaurant/Food Service', 1.6, 1.4),
('Hospitality', 1.6, 1.4),
('Construction/Trades', 1.5, 1.08),
('Manufacturing', 1.45, 1.25),
('Transportation/Logistics', 1.4, 1.2),
('Nonprofit', 1.2, 1.15),
('Law Firm', 1.3, 1.35),
('Accounting/Finance', 1.1, 1.1),
('Marketing/Advertising', 1.15, 1.1),
('Insurance', 1.35, 1.25),
('Automotive', 1.4, 1.2),
('Education', 1.25, 1.2),
('Fitness/Wellness', 1.3, 1.15),
('Entertainment/Events', 1.5, 1.3),
('Agriculture', 1.45, 1.2),
('Technology/IT Services', 1.1, 1.05),
('Multi-entity/Holding Companies', 1.35, 1.25),
('Other', 1.2, 1.15)
ON CONFLICT (industry) DO UPDATE
SET monthly_multiplier = EXCLUDED.monthly_multiplier,
    cleanup_multiplier = EXCLUDED.cleanup_multiplier,
    updated_at = NOW();

-- ===== pricing_revenue_multipliers (ON CONFLICT update) =====
INSERT INTO pricing_revenue_multipliers (revenue_range, multiplier, min_revenue, max_revenue)
VALUES
('<$10K',    1.0,      0,     9999),
('10K-25K',  1.0,  10000,    25000),
('25K-75K',  2.2,  25001,    75000),
('75K-250K', 3.5,  75001,   250000),
('250K-1M',  5.0, 250001,  1000000),
('1M+',      7.0,1000001,       NULL)
ON CONFLICT (revenue_range) DO UPDATE
SET multiplier = EXCLUDED.multiplier,
    min_revenue = EXCLUDED.min_revenue,
    max_revenue = EXCLUDED.max_revenue,
    updated_at = NOW();

-- ===== pricing_transaction_surcharges (ON CONFLICT update) =====
INSERT INTO pricing_transaction_surcharges (transaction_range, surcharge, min_transactions, max_transactions)
VALUES
('<100',        0,     0,     99),
('100-300',   100,   100,    300),
('300-600',   500,   301,    600),
('600-1000',  800,   601,   1000),
('1000-2000',1200,  1001,   2000),
('2000+',    1600,  2001,     NULL)
ON CONFLICT (transaction_range) DO UPDATE
SET surcharge = EXCLUDED.surcharge,
    min_transactions = EXCLUDED.min_transactions,
    max_transactions = EXCLUDED.max_transactions,
    updated_at = NOW();

-- ===== pricing_service_settings (update then insert) =====
-- bookkeeping
UPDATE pricing_service_settings SET setting_value = 60, setting_type = 'fee', description = 'QBO subscription', updated_at = NOW()
WHERE service = 'bookkeeping' AND setting_key = 'qbo_subscription_fee';
INSERT INTO pricing_service_settings (service, setting_key, setting_value, setting_type, description)
SELECT 'bookkeeping', 'qbo_subscription_fee', 60, 'fee', 'QBO subscription'
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_service_settings WHERE service = 'bookkeeping' AND setting_key = 'qbo_subscription_fee'
);

-- taas
UPDATE pricing_service_settings SET setting_value = 75, setting_type = 'fee', description = 'Per entity above 5', updated_at = NOW()
WHERE service = 'taas' AND setting_key = 'entity_upcharge_per_unit';
INSERT INTO pricing_service_settings (service, setting_key, setting_value, setting_type, description)
SELECT 'taas', 'entity_upcharge_per_unit', 75, 'fee', 'Per entity above 5'
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_service_settings WHERE service = 'taas' AND setting_key = 'entity_upcharge_per_unit'
);

UPDATE pricing_service_settings SET setting_value = 50, setting_type = 'fee', description = 'Per additional state above 1', updated_at = NOW()
WHERE service = 'taas' AND setting_key = 'state_upcharge_per_unit';
INSERT INTO pricing_service_settings (service, setting_key, setting_value, setting_type, description)
SELECT 'taas', 'state_upcharge_per_unit', 50, 'fee', 'Per additional state above 1'
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_service_settings WHERE service = 'taas' AND setting_key = 'state_upcharge_per_unit'
);

UPDATE pricing_service_settings SET setting_value = 200, setting_type = 'fee', description = 'International filing fee', updated_at = NOW()
WHERE service = 'taas' AND setting_key = 'international_filing_fee';
INSERT INTO pricing_service_settings (service, setting_key, setting_value, setting_type, description)
SELECT 'taas', 'international_filing_fee', 200, 'fee', 'International filing fee'
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_service_settings WHERE service = 'taas' AND setting_key = 'international_filing_fee'
);

UPDATE pricing_service_settings SET setting_value = 25, setting_type = 'fee', description = 'Per owner above 5', updated_at = NOW()
WHERE service = 'taas' AND setting_key = 'owner_upcharge_per_unit';
INSERT INTO pricing_service_settings (service, setting_key, setting_value, setting_type, description)
SELECT 'taas', 'owner_upcharge_per_unit', 25, 'fee', 'Per owner above 5'
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_service_settings WHERE service = 'taas' AND setting_key = 'owner_upcharge_per_unit'
);

UPDATE pricing_service_settings SET setting_value = 25, setting_type = 'fee', description = 'Messy bookkeeping quality upcharge', updated_at = NOW()
WHERE service = 'taas' AND setting_key = 'bookkeeping_quality_upcharge';
INSERT INTO pricing_service_settings (service, setting_key, setting_value, setting_type, description)
SELECT 'taas', 'bookkeeping_quality_upcharge', 25, 'fee', 'Messy bookkeeping quality upcharge'
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_service_settings WHERE service = 'taas' AND setting_key = 'bookkeeping_quality_upcharge'
);

UPDATE pricing_service_settings SET setting_value = 25, setting_type = 'fee', description = 'Personal 1040 per owner', updated_at = NOW()
WHERE service = 'taas' AND setting_key = 'personal_1040_per_owner';
INSERT INTO pricing_service_settings (service, setting_key, setting_value, setting_type, description)
SELECT 'taas', 'personal_1040_per_owner', 25, 'fee', 'Personal 1040 per owner'
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_service_settings WHERE service = 'taas' AND setting_key = 'personal_1040_per_owner'
);

-- payroll
UPDATE pricing_service_settings SET setting_value = 12, setting_type = 'fee', description = 'Per employee above 3', updated_at = NOW()
WHERE service = 'payroll' AND setting_key = 'employee_fee_per_unit';
INSERT INTO pricing_service_settings (service, setting_key, setting_value, setting_type, description)
SELECT 'payroll', 'employee_fee_per_unit', 12, 'fee', 'Per employee above 3'
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_service_settings WHERE service = 'payroll' AND setting_key = 'employee_fee_per_unit'
);

UPDATE pricing_service_settings SET setting_value = 25, setting_type = 'fee', description = 'Per state above 1', updated_at = NOW()
WHERE service = 'payroll' AND setting_key = 'state_fee_per_unit';
INSERT INTO pricing_service_settings (service, setting_key, setting_value, setting_type, description)
SELECT 'payroll', 'state_fee_per_unit', 25, 'fee', 'Per state above 1'
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_service_settings WHERE service = 'payroll' AND setting_key = 'state_fee_per_unit'
);

-- ap
UPDATE pricing_service_settings SET setting_value = 12, setting_type = 'fee', description = 'Vendor count surcharge per payee above 5', updated_at = NOW()
WHERE service = 'ap' AND setting_key = 'vendor_surcharge_per_unit';
INSERT INTO pricing_service_settings (service, setting_key, setting_value, setting_type, description)
SELECT 'ap', 'vendor_surcharge_per_unit', 12, 'fee', 'Vendor count surcharge per payee above 5'
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_service_settings WHERE service = 'ap' AND setting_key = 'vendor_surcharge_per_unit'
);

UPDATE pricing_service_settings SET setting_value = 2.5, setting_type = 'multiplier', description = 'AP Advanced tier multiplier', updated_at = NOW()
WHERE service = 'ap' AND setting_key = 'advanced_tier_multiplier';
INSERT INTO pricing_service_settings (service, setting_key, setting_value, setting_type, description)
SELECT 'ap', 'advanced_tier_multiplier', 2.5, 'multiplier', 'AP Advanced tier multiplier'
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_service_settings WHERE service = 'ap' AND setting_key = 'advanced_tier_multiplier'
);

-- ar
UPDATE pricing_service_settings SET setting_value = 12, setting_type = 'fee', description = 'Customer count surcharge per customer above 5', updated_at = NOW()
WHERE service = 'ar' AND setting_key = 'customer_surcharge_per_unit';
INSERT INTO pricing_service_settings (service, setting_key, setting_value, setting_type, description)
SELECT 'ar', 'customer_surcharge_per_unit', 12, 'fee', 'Customer count surcharge per customer above 5'
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_service_settings WHERE service = 'ar' AND setting_key = 'customer_surcharge_per_unit'
);

UPDATE pricing_service_settings SET setting_value = 2.5, setting_type = 'multiplier', description = 'AR Advanced tier multiplier', updated_at = NOW()
WHERE service = 'ar' AND setting_key = 'advanced_tier_multiplier';
INSERT INTO pricing_service_settings (service, setting_key, setting_value, setting_type, description)
SELECT 'ar', 'advanced_tier_multiplier', 2.5, 'multiplier', 'AR Advanced tier multiplier'
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_service_settings WHERE service = 'ar' AND setting_key = 'advanced_tier_multiplier'
);

-- agent_of_service
UPDATE pricing_service_settings SET setting_value = 150, setting_type = 'fee', description = 'Additional state/entity fee', updated_at = NOW()
WHERE service = 'agent_of_service' AND setting_key = 'additional_state_fee';
INSERT INTO pricing_service_settings (service, setting_key, setting_value, setting_type, description)
SELECT 'agent_of_service', 'additional_state_fee', 150, 'fee', 'Additional state/entity fee'
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_service_settings WHERE service = 'agent_of_service' AND setting_key = 'additional_state_fee'
);

UPDATE pricing_service_settings SET setting_value = 300, setting_type = 'fee', description = 'Complex case upgrade', updated_at = NOW()
WHERE service = 'agent_of_service' AND setting_key = 'complex_case_fee';
INSERT INTO pricing_service_settings (service, setting_key, setting_value, setting_type, description)
SELECT 'agent_of_service', 'complex_case_fee', 300, 'fee', 'Complex case upgrade'
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_service_settings WHERE service = 'agent_of_service' AND setting_key = 'complex_case_fee'
);

-- ===== pricing_tiers (AP/AR) (update then insert) =====
-- AP LITE
UPDATE pricing_tiers SET base_fee = 150, tier_multiplier = 1.0, updated_at = NOW() WHERE service='ap' AND tier='lite' AND volume_band='0-25';
INSERT INTO pricing_tiers (service, tier, volume_band, base_fee, tier_multiplier)
SELECT 'ap', 'lite', '0-25', 150, 1.0 WHERE NOT EXISTS (
  SELECT 1 FROM pricing_tiers WHERE service='ap' AND tier='lite' AND volume_band='0-25'
);

UPDATE pricing_tiers SET base_fee = 300, tier_multiplier = 1.0, updated_at = NOW() WHERE service='ap' AND tier='lite' AND volume_band='26-100';
INSERT INTO pricing_tiers (service, tier, volume_band, base_fee, tier_multiplier)
SELECT 'ap', 'lite', '26-100', 300, 1.0 WHERE NOT EXISTS (
  SELECT 1 FROM pricing_tiers WHERE service='ap' AND tier='lite' AND volume_band='26-100'
);

UPDATE pricing_tiers SET base_fee = 600, tier_multiplier = 1.0, updated_at = NOW() WHERE service='ap' AND tier='lite' AND volume_band='101-250';
INSERT INTO pricing_tiers (service, tier, volume_band, base_fee, tier_multiplier)
SELECT 'ap', 'lite', '101-250', 600, 1.0 WHERE NOT EXISTS (
  SELECT 1 FROM pricing_tiers WHERE service='ap' AND tier='lite' AND volume_band='101-250'
);

UPDATE pricing_tiers SET base_fee = 1000, tier_multiplier = 1.0, updated_at = NOW() WHERE service='ap' AND tier='lite' AND volume_band='251+';
INSERT INTO pricing_tiers (service, tier, volume_band, base_fee, tier_multiplier)
SELECT 'ap', 'lite', '251+', 1000, 1.0 WHERE NOT EXISTS (
  SELECT 1 FROM pricing_tiers WHERE service='ap' AND tier='lite' AND volume_band='251+'
);

-- AP ADVANCED
UPDATE pricing_tiers SET base_fee = 150, tier_multiplier = 2.5, updated_at = NOW() WHERE service='ap' AND tier='advanced' AND volume_band='0-25';
INSERT INTO pricing_tiers (service, tier, volume_band, base_fee, tier_multiplier)
SELECT 'ap', 'advanced', '0-25', 150, 2.5 WHERE NOT EXISTS (
  SELECT 1 FROM pricing_tiers WHERE service='ap' AND tier='advanced' AND volume_band='0-25'
);

UPDATE pricing_tiers SET base_fee = 300, tier_multiplier = 2.5, updated_at = NOW() WHERE service='ap' AND tier='advanced' AND volume_band='26-100';
INSERT INTO pricing_tiers (service, tier, volume_band, base_fee, tier_multiplier)
SELECT 'ap', 'advanced', '26-100', 300, 2.5 WHERE NOT EXISTS (
  SELECT 1 FROM pricing_tiers WHERE service='ap' AND tier='advanced' AND volume_band='26-100'
);

UPDATE pricing_tiers SET base_fee = 600, tier_multiplier = 2.5, updated_at = NOW() WHERE service='ap' AND tier='advanced' AND volume_band='101-250';
INSERT INTO pricing_tiers (service, tier, volume_band, base_fee, tier_multiplier)
SELECT 'ap', 'advanced', '101-250', 600, 2.5 WHERE NOT EXISTS (
  SELECT 1 FROM pricing_tiers WHERE service='ap' AND tier='advanced' AND volume_band='101-250'
);

UPDATE pricing_tiers SET base_fee = 1000, tier_multiplier = 2.5, updated_at = NOW() WHERE service='ap' AND tier='advanced' AND volume_band='251+';
INSERT INTO pricing_tiers (service, tier, volume_band, base_fee, tier_multiplier)
SELECT 'ap', 'advanced', '251+', 1000, 2.5 WHERE NOT EXISTS (
  SELECT 1 FROM pricing_tiers WHERE service='ap' AND tier='advanced' AND volume_band='251+'
);

-- AR LITE
UPDATE pricing_tiers SET base_fee = 150, tier_multiplier = 1.0, updated_at = NOW() WHERE service='ar' AND tier='lite' AND volume_band='0-25';
INSERT INTO pricing_tiers (service, tier, volume_band, base_fee, tier_multiplier)
SELECT 'ar', 'lite', '0-25', 150, 1.0 WHERE NOT EXISTS (
  SELECT 1 FROM pricing_tiers WHERE service='ar' AND tier='lite' AND volume_band='0-25'
);

UPDATE pricing_tiers SET base_fee = 300, tier_multiplier = 1.0, updated_at = NOW() WHERE service='ar' AND tier='lite' AND volume_band='26-100';
INSERT INTO pricing_tiers (service, tier, volume_band, base_fee, tier_multiplier)
SELECT 'ar', 'lite', '26-100', 300, 1.0 WHERE NOT EXISTS (
  SELECT 1 FROM pricing_tiers WHERE service='ar' AND tier='lite' AND volume_band='26-100'
);

UPDATE pricing_tiers SET base_fee = 600, tier_multiplier = 1.0, updated_at = NOW() WHERE service='ar' AND tier='lite' AND volume_band='101-250';
INSERT INTO pricing_tiers (service, tier, volume_band, base_fee, tier_multiplier)
SELECT 'ar', 'lite', '101-250', 600, 1.0 WHERE NOT EXISTS (
  SELECT 1 FROM pricing_tiers WHERE service='ar' AND tier='lite' AND volume_band='101-250'
);

UPDATE pricing_tiers SET base_fee = 1000, tier_multiplier = 1.0, updated_at = NOW() WHERE service='ar' AND tier='lite' AND volume_band='251+';
INSERT INTO pricing_tiers (service, tier, volume_band, base_fee, tier_multiplier)
SELECT 'ar', 'lite', '251+', 1000, 1.0 WHERE NOT EXISTS (
  SELECT 1 FROM pricing_tiers WHERE service='ar' AND tier='lite' AND volume_band='251+'
);

-- AR ADVANCED
UPDATE pricing_tiers SET base_fee = 150, tier_multiplier = 2.5, updated_at = NOW() WHERE service='ar' AND tier='advanced' AND volume_band='0-25';
INSERT INTO pricing_tiers (service, tier, volume_band, base_fee, tier_multiplier)
SELECT 'ar', 'advanced', '0-25', 150, 2.5 WHERE NOT EXISTS (
  SELECT 1 FROM pricing_tiers WHERE service='ar' AND tier='advanced' AND volume_band='0-25'
);

UPDATE pricing_tiers SET base_fee = 300, tier_multiplier = 2.5, updated_at = NOW() WHERE service='ar' AND tier='advanced' AND volume_band='26-100';
INSERT INTO pricing_tiers (service, tier, volume_band, base_fee, tier_multiplier)
SELECT 'ar', 'advanced', '26-100', 300, 2.5 WHERE NOT EXISTS (
  SELECT 1 FROM pricing_tiers WHERE service='ar' AND tier='advanced' AND volume_band='26-100'
);

UPDATE pricing_tiers SET base_fee = 600, tier_multiplier = 2.5, updated_at = NOW() WHERE service='ar' AND tier='advanced' AND volume_band='101-250';
INSERT INTO pricing_tiers (service, tier, volume_band, base_fee, tier_multiplier)
SELECT 'ar', 'advanced', '101-250', 600, 2.5 WHERE NOT EXISTS (
  SELECT 1 FROM pricing_tiers WHERE service='ar' AND tier='advanced' AND volume_band='101-250'
);

UPDATE pricing_tiers SET base_fee = 1000, tier_multiplier = 2.5, updated_at = NOW() WHERE service='ar' AND tier='advanced' AND volume_band='251+';
INSERT INTO pricing_tiers (service, tier, volume_band, base_fee, tier_multiplier)
SELECT 'ar', 'advanced', '251+', 1000, 2.5 WHERE NOT EXISTS (
  SELECT 1 FROM pricing_tiers WHERE service='ar' AND tier='advanced' AND volume_band='251+'
);

COMMIT;

-- Verification counts
SELECT 'pricing_base' AS table, COUNT(*) FROM pricing_base
UNION ALL SELECT 'pricing_industry_multipliers', COUNT(*) FROM pricing_industry_multipliers
UNION ALL SELECT 'pricing_revenue_multipliers', COUNT(*) FROM pricing_revenue_multipliers
UNION ALL SELECT 'pricing_transaction_surcharges', COUNT(*) FROM pricing_transaction_surcharges
UNION ALL SELECT 'pricing_service_settings', COUNT(*) FROM pricing_service_settings
UNION ALL SELECT 'pricing_tiers', COUNT(*) FROM pricing_tiers;

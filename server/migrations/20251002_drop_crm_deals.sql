-- Drop crm_deals table
-- We don't use this table; deals are managed elsewhere in the pipeline

DROP TABLE IF EXISTS crm_deals CASCADE;

-- Note: This will also drop any foreign keys and policies referencing crm_deals

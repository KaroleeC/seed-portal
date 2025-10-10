-- Add missing start_date column to sales_reps table
-- This column is referenced in the schema but missing from the actual database

ALTER TABLE sales_reps 
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP DEFAULT NOW() NOT NULL;

-- Add missing end_date column as well (also in schema)
ALTER TABLE sales_reps 
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP;

-- Update existing records to have a start_date if they don't have one
UPDATE sales_reps 
SET start_date = created_at 
WHERE start_date IS NULL;

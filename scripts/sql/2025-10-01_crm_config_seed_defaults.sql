-- Seed default CRM lead config (idempotent upserts)
INSERT INTO crm_lead_sources (key, label, is_active, sort_order)
VALUES
  ('facebook','Facebook',true,10),
  ('leadexec','LeadExec',true,20),
  ('zapier','Zapier',true,30),
  ('manual','Manual',true,40),
  ('other','Other',true,99)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
--> statement-breakpoint
INSERT INTO crm_lead_statuses (key, label, is_active, sort_order)
VALUES
  ('new','New',true,10),
  ('validated','Validated',true,20),
  ('assigned','Assigned',true,30),
  ('disqualified','Disqualified',true,90)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
--> statement-breakpoint
INSERT INTO crm_lead_stages (key, label, is_active, sort_order)
VALUES
  ('unassigned','Unassigned',true,10),
  ('assigned','Assigned',true,20),
  ('discovery_booked','Discovery Booked',true,30),
  ('quoted','Quoted',true,40),
  ('closed_won','Closed Won',true,80),
  ('closed_lost','Closed Lost',true,90)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

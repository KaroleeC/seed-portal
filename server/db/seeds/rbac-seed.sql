-- RBAC Seed Data - Phase 2
-- This script seeds the initial roles and permissions for the RBAC system
-- Run this after the RBAC tables have been created

-- Insert Roles
INSERT INTO roles (name, description, is_active) VALUES
  ('admin', 'System administrator with full access', true),
  ('sales_manager', 'Sales team manager with team oversight', true),
  ('sales_rep', 'Sales representative with individual access', true),
  ('service_manager', 'Service team manager with team oversight', true),
  ('service_rep', 'Service representative with client support access', true),
  ('finance', 'Finance team member with financial data access', true),
  ('viewer', 'Read-only access to basic information', true)
ON CONFLICT (name) DO NOTHING;

-- Insert Permissions
INSERT INTO permissions (key, description, category, is_active) VALUES
  -- Admin permissions
  ('admin.*', 'Full administrative access', 'admin', true),
  ('admin.access', 'Access admin dashboard and features', 'admin', true),
  ('admin.debug', 'Access debugging and diagnostics tools', 'admin', true),
  ('diagnostics.view', 'View system diagnostics and health checks', 'admin', true),
  
  -- User management permissions
  ('users.view', 'View user accounts', 'users', true),
  ('users.manage', 'Manage user accounts', 'users', true),
  ('users.create', 'Create new user accounts', 'users', true),
  ('users.update', 'Update user accounts', 'users', true),
  ('users.delete', 'Delete user accounts', 'users', true),
  
  -- Role management permissions
  ('roles.view', 'View roles', 'roles', true),
  ('roles.manage', 'Manage roles', 'roles', true),
  ('roles.assign', 'Assign roles to users', 'roles', true),
  ('roles.remove', 'Remove roles from users', 'roles', true),
  
  -- Permission management permissions
  ('permissions.view', 'View permissions', 'permissions', true),
  ('permissions.manage', 'Manage permissions', 'permissions', true),
  
  -- Commission permissions
  ('commissions.view', 'View all commission data', 'commissions', true),
  ('commissions.view_own', 'View own commission data only', 'commissions', true),
  ('commissions.sync', 'Sync commission data with HubSpot', 'commissions', true),
  ('commissions.manage_team', 'Manage team commission data', 'commissions', true),
  ('commissions.approve', 'Approve commission adjustments', 'commissions', true),
  
  -- Payout permissions
  ('payouts.view', 'View payout information', 'payouts', true),
  ('payouts.approve', 'Approve payouts', 'payouts', true),
  ('payouts.process', 'Process payout transactions', 'payouts', true),
  
  -- Quote permissions
  ('quotes.view', 'View quotes', 'quotes', true),
  ('quotes.create', 'Create new quotes', 'quotes', true),
  ('quotes.update', 'Update existing quotes', 'quotes', true),
  ('quotes.delete', 'Delete quotes', 'quotes', true),
  ('quotes.approve', 'Approve quotes requiring approval', 'quotes', true),
  
  -- HubSpot permissions
  ('hubspot.push', 'Push data to HubSpot', 'hubspot', true),
  ('hubspot.update', 'Update HubSpot records', 'hubspot', true),
  ('hubspot.sync', 'Sync data with HubSpot', 'hubspot', true),
  ('hubspot.view', 'View HubSpot integration status', 'hubspot', true),
  
  -- Deal permissions
  ('deals.view', 'View deal information', 'deals', true),
  ('deals.update', 'Update deal information', 'deals', true),
  ('deals.sync', 'Sync deal data', 'deals', true),
  ('deals.manage_team', 'Manage team deals', 'deals', true),
  
  -- Pricing permissions
  ('pricing.view', 'View pricing configuration', 'pricing', true),
  ('pricing.update', 'Update pricing configuration', 'pricing', true),
  
  -- Calculator permissions
  ('calculator.use', 'Use the quote calculator', 'calculator', true),
  ('calculator.admin', 'Administer calculator settings', 'calculator', true),
  
  -- Reports permissions
  ('reports.view', 'View reports and analytics', 'reports', true),
  ('reports.export', 'Export report data', 'reports', true),
  
  -- Client permissions
  ('clients.view', 'View client information', 'clients', true),
  ('clients.manage', 'Manage client accounts', 'clients', true),
  
  -- Department management permissions
  ('departments.view', 'View departments and organizational structure', 'departments', true),
  ('departments.manage', 'Manage departments and organizational structure', 'departments', true),
  
  -- System administration permissions
  ('admin.audit', 'View system audit logs', 'admin', true),
  ('admin.cache', 'Manage system cache', 'admin', true),
  ('admin.impersonate', 'Impersonate other users', 'admin', true),
  ('admin.metrics', 'View system metrics and analytics', 'admin', true),
  ('admin.logs', 'View system logs', 'admin', true),
  ('admin.diagnostics', 'Run system diagnostics', 'admin', true),
  ('admin.policies', 'Manage authorization policies', 'admin', true),
  
  -- CRM configuration permissions
  ('crm.config.view', 'View CRM configuration', 'crm', true),
  ('crm.config.manage', 'Manage CRM configuration (sources, statuses, stages)', 'crm', true),
  
  -- Commission adjustment permissions
  ('commissions.update', 'Update commission records', 'commissions', true),
  ('commissions.reject', 'Reject commission adjustments', 'commissions', true),
  ('commissions.unreject', 'Unreject commission adjustments', 'commissions', true),
  ('commissions.view_adjustments', 'View commission adjustments', 'commissions', true),
  ('commissions.view_projections', 'View pipeline projections', 'commissions', true),
  ('commissions.view_summary', 'View commission summaries', 'commissions', true)
ON CONFLICT (key) DO NOTHING;

-- Assign permissions to roles
-- Admin gets everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.is_active = true
ON CONFLICT DO NOTHING;

-- Sales Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'sales_manager' AND p.key IN (
  'commissions.view',
  'commissions.manage_team',
  'commissions.sync',
  'quotes.view',
  'quotes.create',
  'quotes.update',
  'quotes.approve',
  'deals.view',
  'deals.update',
  'deals.sync',
  'deals.manage_team',
  'hubspot.view',
  'hubspot.push',
  'hubspot.update',
  'hubspot.sync',
  'calculator.use',
  'calculator.admin',
  'reports.view',
  'reports.export',
  'clients.view',
  'clients.manage',
  'pricing.view'
)
ON CONFLICT DO NOTHING;

-- Sales Rep permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'sales_rep' AND p.key IN (
  'commissions.view_own',
  'quotes.view',
  'quotes.create',
  'quotes.update',
  'deals.view',
  'deals.update',
  'hubspot.view',
  'hubspot.push',
  'calculator.use',
  'reports.view',
  'clients.view',
  'pricing.view'
)
ON CONFLICT DO NOTHING;

-- Service Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'service_manager' AND p.key IN (
  'quotes.view',
  'quotes.update',
  'deals.view',
  'hubspot.view',
  'hubspot.update',
  'calculator.use',
  'reports.view',
  'reports.export',
  'clients.view',
  'clients.manage',
  'pricing.view'
)
ON CONFLICT DO NOTHING;

-- Service Rep permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'service_rep' AND p.key IN (
  'quotes.view',
  'deals.view',
  'hubspot.view',
  'calculator.use',
  'reports.view',
  'clients.view',
  'pricing.view'
)
ON CONFLICT DO NOTHING;

-- Finance permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'finance' AND p.key IN (
  'commissions.view',
  'payouts.view',
  'payouts.approve',
  'payouts.process',
  'quotes.view',
  'deals.view',
  'reports.view',
  'reports.export',
  'pricing.view'
)
ON CONFLICT DO NOTHING;

-- Viewer permissions (read-only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'viewer' AND p.key IN (
  'quotes.view',
  'deals.view',
  'hubspot.view',
  'reports.view',
  'clients.view',
  'pricing.view'
)
ON CONFLICT DO NOTHING;

-- Assign default roles to existing users based on their current role field
-- Admin users get admin role
INSERT INTO user_roles (user_id, role_id, assigned_by, assigned_at)
SELECT u.id, r.id, u.id, NOW()
FROM users u, roles r
WHERE u.role = 'admin' AND r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Employee users get sales_rep role by default (can be adjusted later)
INSERT INTO user_roles (user_id, role_id, assigned_by, assigned_at)
SELECT u.id, r.id, 
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1), -- Assigned by first admin
  NOW()
FROM users u, roles r
WHERE u.role = 'employee' AND r.name = 'sales_rep'
ON CONFLICT DO NOTHING;

-- Create default departments
INSERT INTO departments (name, description, is_active) VALUES
  ('Sales', 'Sales team responsible for client acquisition', true),
  ('Service', 'Service team responsible for client support', true),
  ('Finance', 'Finance team responsible for financial operations', true),
  ('Administration', 'Administrative team', true)
ON CONFLICT (name) DO NOTHING;

-- Verification queries
SELECT 'Roles created:' as info, COUNT(*) as count FROM roles WHERE is_active = true;
SELECT 'Permissions created:' as info, COUNT(*) as count FROM permissions WHERE is_active = true;
SELECT 'Role-Permission mappings:' as info, COUNT(*) as count FROM role_permissions;
SELECT 'User-Role assignments:' as info, COUNT(*) as count FROM user_roles;
SELECT 'Departments created:' as info, COUNT(*) as count FROM departments WHERE is_active = true;

-- Show role-permission summary
SELECT 
  r.name as role_name,
  COUNT(rp.permission_id) as permission_count,
  STRING_AGG(p.key, ', ' ORDER BY p.key) as permissions
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id AND p.is_active = true
WHERE r.is_active = true
GROUP BY r.id, r.name
ORDER BY r.name;

-- Show user-role assignments
SELECT 
  u.email,
  u.role as legacy_role,
  STRING_AGG(r.name, ', ' ORDER BY r.name) as assigned_roles
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id AND r.is_active = true
WHERE u.email LIKE '%@seedfinancial.io'
GROUP BY u.id, u.email, u.role
ORDER BY u.email;

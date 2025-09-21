import type { Express } from "express";
import { GoogleAdminService } from "./google-admin";
import { storage } from "./storage";
import { requireAuth } from "./auth";
import { scheduleWorkspaceSync } from "./jobs";
import { CalculatorContentResponseSchema, CalculatorContentItemResponseSchema } from "@shared/contracts";

export async function registerAdminRoutes(app: Express): Promise<void> {
  let googleAdminService: GoogleAdminService | null = null;
  
  // Initialize Google Admin service if configured
  try {
    googleAdminService = new GoogleAdminService();
    // Wait for initialization to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    const isConfigured = await googleAdminService.isConfigured();
    if (!isConfigured) {
      // Don't log as warning - this is optional
      googleAdminService = null;
    } else {
      console.log('Google Admin API configured successfully');
    }
  } catch (error) {
    // Don't log as warning - this is optional functionality
    googleAdminService = null;
  }

  // Middleware to check admin access after authentication
  const requireAdmin = (req: any, res: any, next: any) => {
    console.log('Admin access check:', {
      hasUser: !!req.user,
      userEmail: req.user?.email,
      userRole: req.user?.role
    });

    // For hardcoded admin email - always allow
    if (req.user?.email === 'jon@seedfinancial.io') {
      return next();
    }
    
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    next();
  };

  // Get all Google Workspace users
  app.get('/api/admin/workspace-users', requireAuth, requireAdmin, async (req, res) => {
    try {
      if (!googleAdminService) {
        return res.status(503).json({ 
          message: 'Google Admin API not configured',
          configured: false,
          setupInstructions: {
            issue: 'ADC file missing or invalid refresh token',
            steps: [
              '1. On your local machine, run:',
              '   gcloud auth application-default login --scopes=https://www.googleapis.com/auth/admin.directory.user.readonly,https://www.googleapis.com/auth/admin.directory.group.readonly',
              '2. This will open a browser to authenticate with your @seedfinancial.io admin account',
              '3. Copy the generated file from your local machine:',
              '   Mac/Linux: ~/.config/gcloud/application_default_credentials.json',
              '   Windows: %APPDATA%\\gcloud\\application_default_credentials.json',
              '4. In Replit, create the file at: ~/.config/gcloud/application_default_credentials.json',
              '5. Restart the application'
            ]
          }
        });
      }

      const workspaceUsers = await googleAdminService.getAllDomainUsers();
      res.json({ 
        users: workspaceUsers,
        configured: true
      });
    } catch (error: any) {
      console.error('Error fetching workspace users:', error);
      
      // Handle various Google Admin API errors
      if (error.code === 403) {
        if (error.message?.includes('Insufficient Permission') || error.message?.includes('Request had insufficient authentication scopes')) {
          return res.status(500).json({ 
            message: 'Insufficient Permissions',
            error: 'The credential lacks required Admin SDK scopes',
            setupInstructions: {
              currentIssue: 'The credential does not have Admin Directory API access',
              solution: 'Re-create the ADC file with proper Admin SDK scopes',
              step1: 'Run: gcloud auth application-default revoke',
              step2: 'Run: gcloud auth application-default login --scopes=https://www.googleapis.com/auth/admin.directory.user.readonly,https://www.googleapis.com/auth/admin.directory.group.readonly',
              step3: 'Copy the new ADC file to ~/.config/gcloud/application_default_credentials.json in Replit',
              step4: 'Ensure the user account has Google Workspace Admin role',
              note: 'For development, use authorized_user ADC with Admin Directory scopes'
            }
          });
        }
        
        if (error.message?.includes('Not Authorized to access this resource/api')) {
          return res.status(500).json({
            message: 'API Access Denied',
            error: 'Admin SDK API not enabled or user lacks Workspace admin privileges',
            setupInstructions: {
              currentIssue: 'Either the Admin SDK API is not enabled or the user lacks admin permissions',
              solution: 'Enable Admin SDK API and ensure user is a Workspace admin',
              step1: 'Go to Google Cloud Console → APIs & Services → Library',
              step2: 'Search for "Admin SDK API" and enable it',
              step3: 'Ensure the authenticated user has Google Workspace Super Admin role',
              step4: 'Re-run: gcloud auth application-default login with admin user',
              note: 'Only Workspace Super Admins can access the Directory API'
            }
          });
        }
      }
      
      if (error.message?.includes('iam.serviceAccounts.getAccessToken')) {
        return res.status(500).json({ 
          message: 'Google Workspace Admin API Setup Issue',
          error: 'Impersonated service account requires complex setup',
          setupInstructions: {
            currentIssue: 'Impersonated service accounts need additional IAM permissions that can be complex to configure',
            recommendedSolution: 'Create a direct service account instead (much simpler setup)',
            step1: 'Go to Google Cloud Console → IAM & Admin → Service Accounts',
            step2: 'Create a new service account (e.g., "seedos-admin-direct")',
            step3: 'Download the JSON key file',
            step4: 'Replace the current GOOGLE_SERVICE_ACCOUNT_JSON secret with the new direct service account JSON',
            step5: 'In Google Workspace Admin Console → Security → API Controls → Domain-wide Delegation',
            step6: 'Add the new service account client ID with these scopes:',
            scopes: [
              'https://www.googleapis.com/auth/admin.directory.user.readonly',
              'https://www.googleapis.com/auth/admin.directory.group.readonly',
              'https://www.googleapis.com/auth/admin.directory.group.member.readonly'
            ],
            note: 'Direct service accounts are much more reliable than impersonated ones for this use case'
          }
        });
      }
      
      res.status(500).json({ 
        message: 'Failed to fetch workspace users: ' + error.message 
      });
    }
  });

  // Get all users from our database
  app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json({ users });
    } catch (error: any) {
      console.error('Error fetching users:', error);
      res.status(500).json({ 
        message: 'Failed to fetch users: ' + error.message 
      });
    }
  });

  // Update user role
  app.patch('/api/admin/users/:userId/role', requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { role } = req.body;
      const adminUserId = req.user?.id;
      if (!adminUserId) {
        return res.status(401).json({ message: 'User ID required' });
      }

      if (!role || !['admin', 'employee'].includes(role)) {
        return res.status(400).json({ 
          message: 'Invalid role. Must be admin or employee' 
        });
      }

      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      const updatedUser = await storage.updateUserRole(userId, role, adminUserId);
      
      res.json({ 
        message: 'User role updated successfully',
        user: updatedUser
      });
    } catch (error: any) {
      console.error('Error updating user role:', error);
      res.status(500).json({ 
        message: 'Failed to update user role: ' + error.message 
      });
    }
  });

  // Sync a Google Workspace user to our database
  app.post('/api/admin/sync-workspace-user', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { email, role = 'employee' } = req.body;
      const adminUserId = req.user?.id;
      if (!adminUserId) {
        return res.status(401).json({ message: 'User ID required' });
      }

      if (!email || !email.endsWith('@seedfinancial.io')) {
        return res.status(400).json({ 
          message: 'Invalid email or not a Seed Financial email' 
        });
      }

      // Check if user already exists
      let user = await storage.getUserByEmail(email);
      
      if (user) {
        // Update existing user's role
        user = await storage.updateUserRole(user.id, role, adminUserId);
        return res.json({ 
          message: 'Existing user role updated',
          user,
          action: 'updated'
        });
      }

      // Create new user with plain password; storage will hash
      user = await storage.createUser({
        email,
        password: 'SeedAdmin1!', // Default password; hashed in storage.createUser
        firstName: '',
        lastName: '',
        hubspotUserId: null,
        role,
      } as any);

      // Ensure role assignment metadata is set consistently
      user = await storage.updateUserRole(user.id, role, adminUserId);

      res.json({ 
        message: 'User created successfully',
        user,
        action: 'created'
      });
    } catch (error: any) {
      console.error('Error syncing workspace user:', error);
      res.status(500).json({ 
        message: 'Failed to sync workspace user: ' + error.message 
      });
    }
  });

  // Create a new user
  app.post('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { firstName, lastName, email, role = 'employee', defaultDashboard = 'sales' } = req.body;
      const adminUserId = req.user?.id;
      if (!adminUserId) {
        return res.status(401).json({ message: 'User ID required' });
      }

      if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
        return res.status(400).json({ 
          message: 'First name, last name, and email are required' 
        });
      }

      if (!email.endsWith('@seedfinancial.io')) {
        return res.status(400).json({ 
          message: 'Email must be a @seedfinancial.io address' 
        });
      }

      if (!['admin', 'employee'].includes(role)) {
        return res.status(400).json({ 
          message: 'Invalid role. Must be admin or employee' 
        });
      }

      if (!['admin', 'sales', 'service'].includes(defaultDashboard)) {
        return res.status(400).json({ 
          message: 'Invalid default dashboard. Must be admin, sales, or service' 
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ 
          message: 'A user with this email already exists' 
        });
      }

      // Generate a random password
      const generatedPassword = generatePassword();

      // Create new user with plain password; storage will hash
      let user = await storage.createUser({
        email,
        password: generatedPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        hubspotUserId: null,
        role,
        defaultDashboard,
      } as any);

      // Ensure role assignment metadata is set consistently
      user = await storage.updateUserRole(user.id, role, adminUserId);

      res.json({ 
        message: 'User created successfully',
        user,
        generatedPassword // Return the password so admin can share it
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      res.status(500).json({ 
        message: 'Failed to create user: ' + error.message 
      });
    }
  });

  // Delete a user
  app.delete('/api/admin/users/:userId', requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const currentUserId = req.user?.id;
      if (!currentUserId) {
        return res.status(401).json({ message: 'User ID required' });
      }

      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      // Prevent user from deleting themselves
      if (userId === currentUserId) {
        return res.status(400).json({ 
          message: 'You cannot delete your own account' 
        });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      await storage.deleteUser(userId);
      
      res.json({ 
        message: 'User deleted successfully',
        deletedUser: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName }
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      res.status(500).json({ 
        message: 'Failed to delete user: ' + error.message 
      });
    }
  });

  // Generate password reset for a user
  app.post('/api/admin/users/:userId/reset-password', requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Generate a new password
      const newPassword = generatePassword();
      const hashedPassword = await hashPassword(newPassword);

      // Update user's password
      await storage.updateUserPassword(userId, hashedPassword);
      
      res.json({ 
        message: 'Password reset successfully',
        newPassword,
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName }
      });
    } catch (error: any) {
      console.error('Error resetting password:', error);
      res.status(500).json({ 
        message: 'Failed to reset password: ' + error.message 
      });
    }
  });

  // Trigger manual workspace sync
  app.post('/api/admin/sync-workspace', requireAuth, requireAdmin, async (req, res) => {
    try {
      const adminUserId = req.user?.id;
      if (!adminUserId) {
        return res.status(401).json({ message: 'User ID required' });
      }
      const job = await scheduleWorkspaceSync('manual', adminUserId);
      res.json({ 
        message: 'Workspace sync job scheduled successfully',
        jobId: job.id,
        status: 'scheduled'
      });
    } catch (error: any) {
      console.error('Error scheduling workspace sync:', error);
      res.status(500).json({ 
        message: 'Failed to schedule workspace sync: ' + error.message 
      });
    }
  });

  // Test Google Admin API connection
  app.get('/api/admin/test-google-admin', requireAuth, requireAdmin, async (req, res) => {
    try {
      if (!googleAdminService) {
        return res.json({ 
          connected: false,
          configured: false,
          message: 'Google Admin API not configured'
        });
      }

      const testResult = await googleAdminService.testConnection();
      res.json({ 
        connected: testResult.connected,
        configured: true,
        message: testResult.connected ? 'Connection successful' : (testResult.error || 'Connection failed')
      });
    } catch (error: any) {
      res.json({ 
        connected: false,
        configured: true,
        message: 'Connection test failed: ' + error.message
      });
    }
  });

  // Impersonate user
  app.post('/api/admin/impersonate/:userId', requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (!userId || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      // Get the user to impersonate
      const userToImpersonate = await storage.getUser(userId);
      if (!userToImpersonate) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Ensure current user is present
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      // Store original user info in session for later restoration
      (req.session as any).originalUser = {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
        defaultDashboard: req.user.defaultDashboard
      };
      (req.session as any).isImpersonating = true;
      
      console.log('🎭 IMPERSONATION STARTED:');
      console.log('🎭 Original admin:', req.user.email, `(${req.user.id})`);
      console.log('🎭 Impersonating:', userToImpersonate.email, `(${userToImpersonate.id})`);
      console.log('🎭 Session ID:', req.sessionID);
      console.log('🎭 Session isImpersonating:', (req.session as any).isImpersonating);

      // Update session with impersonated user - use passport's login method
      req.login(userToImpersonate, (err) => {
        if (err) {
          console.error('Error logging in as impersonated user:', err);
          return res.status(500).json({ 
            message: 'Failed to start impersonation: ' + err.message 
          });
        }
        
        res.json({
          message: 'Impersonation started successfully',
          user: userToImpersonate,
          isImpersonating: true
        });
      });
    } catch (error: any) {
      console.error('Error starting impersonation:', error);
      res.status(500).json({ 
        message: 'Failed to start impersonation: ' + error.message 
      });
    }
  });

  // Stop impersonation and return to original admin user
  app.post('/api/admin/stop-impersonation', requireAuth, async (req, res) => {
    try {
      console.log('🛑 STOP IMPERSONATION CALLED:');
      console.log('🛑 Session ID:', req.sessionID);
      
      // Check original user info stored in session
      const impersonationData = (req.session as any).originalUser;
      if (!impersonationData) {
        console.log('🛑 ERROR: Not currently impersonating');
        return res.status(400).json({ 
          message: 'Not currently impersonating a user' 
        });
      }

      console.log('🛑 Found impersonation data:', impersonationData.email || impersonationData.adminEmail);

      // Get the full original admin user data from database
      const fullOriginalUser = await storage.getUser(impersonationData.id || impersonationData.adminUserId);
      if (!fullOriginalUser) {
        return res.status(404).json({ 
          message: 'Original admin user not found' 
        });
      }

      // Clear impersonation data from session
      delete (req.session as any).originalUser;
      delete (req.session as any).isImpersonating;

      // Restore original user session using passport's login method
      req.login(fullOriginalUser, (err) => {
        if (err) {
          console.error('Error restoring original user session:', err);
          return res.status(500).json({ 
            message: 'Failed to stop impersonation: ' + err.message 
          });
        }
        
        res.json({
          message: 'Impersonation stopped successfully',
          user: fullOriginalUser,
          isImpersonating: false
        });
      });
    } catch (error: any) {
      console.error('Error stopping impersonation:', error);
      res.status(500).json({ 
        message: 'Failed to stop impersonation: ' + error.message 
      });
    }
  });

  // ===== PRICING CONFIGURATION ENDPOINTS =====
  
  // Import pricing services
  const { pricingConfigService } = await import('./pricing-config');
  const { 
    insertPricingBaseSchema, insertPricingIndustryMultiplierSchema, 
    insertPricingRevenueMultiplierSchema, insertPricingTransactionSurchargeSchema,
    insertPricingServiceSettingSchema, insertPricingTierSchema 
  } = await import('@shared/schema');

  // Get all pricing configurations
  app.get('/api/admin/pricing/config', requireAuth, requireAdmin, async (req, res) => {
    try {
      const config = await pricingConfigService.loadPricingConfig();
      res.json(config);
    } catch (error: any) {
      console.error('Error loading pricing config:', error);
      res.status(500).json({ message: 'Failed to load pricing configuration: ' + error.message });
    }
  });

  // Get base pricing for all services
  app.get('/api/admin/pricing/base', requireAuth, requireAdmin, async (req, res) => {
    try {
      const basePricing = await storage.getAllPricingBase();
      res.json(basePricing);
    } catch (error: any) {
      console.error('Error fetching base pricing:', error);
      res.status(500).json({ message: 'Failed to fetch base pricing: ' + error.message });
    }
  });

  // Update base pricing
  app.put('/api/admin/pricing/base/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertPricingBaseSchema.partial().parse(req.body);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID required' });
      }

      const updated = await storage.updatePricingBase(parseInt(id), updateData, userId);
      
      // Clear cache after update
      await pricingConfigService.clearCache();
      
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating base pricing:', error);
      res.status(500).json({ message: 'Failed to update base pricing: ' + error.message });
    }
  });

  // Get industry multipliers
  app.get('/api/admin/pricing/industry-multipliers', requireAuth, requireAdmin, async (req, res) => {
    try {
      const multipliers = await storage.getAllIndustryMultipliers();
      res.json(multipliers);
    } catch (error: any) {
      console.error('Error fetching industry multipliers:', error);
      res.status(500).json({ message: 'Failed to fetch industry multipliers: ' + error.message });
    }
  });

  // Update industry multiplier
  app.put('/api/admin/pricing/industry-multipliers/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertPricingIndustryMultiplierSchema.partial().parse(req.body);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID required' });
      }

      const updated = await storage.updateIndustryMultiplier(parseInt(id), updateData, userId);
      
      // Clear cache after update
      await pricingConfigService.clearCache();
      
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating industry multiplier:', error);
      res.status(500).json({ message: 'Failed to update industry multiplier: ' + error.message });
    }
  });

  // Get revenue multipliers
  app.get('/api/admin/pricing/revenue-multipliers', requireAuth, requireAdmin, async (req, res) => {
    try {
      const multipliers = await storage.getAllRevenueMultipliers();
      res.json(multipliers);
    } catch (error: any) {
      console.error('Error fetching revenue multipliers:', error);
      res.status(500).json({ message: 'Failed to fetch revenue multipliers: ' + error.message });
    }
  });

  // Update revenue multiplier
  app.put('/api/admin/pricing/revenue-multipliers/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertPricingRevenueMultiplierSchema.partial().parse(req.body);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID required' });
      }

      const updated = await storage.updateRevenueMultiplier(parseInt(id), updateData, userId);
      
      // Clear cache after update
      await pricingConfigService.clearCache();
      
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating revenue multiplier:', error);
      res.status(500).json({ message: 'Failed to update revenue multiplier: ' + error.message });
    }
  });

  // Get transaction surcharges
  app.get('/api/admin/pricing/transaction-surcharges', requireAuth, requireAdmin, async (req, res) => {
    try {
      const surcharges = await storage.getAllTransactionSurcharges();
      res.json(surcharges);
    } catch (error: any) {
      console.error('Error fetching transaction surcharges:', error);
      res.status(500).json({ message: 'Failed to fetch transaction surcharges: ' + error.message });
    }
  });

  // Update transaction surcharge
  app.put('/api/admin/pricing/transaction-surcharges/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertPricingTransactionSurchargeSchema.partial().parse(req.body);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID required' });
      }

      const updated = await storage.updateTransactionSurcharge(parseInt(id), updateData, userId);
      
      // Clear cache after update
      await pricingConfigService.clearCache();
      
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating transaction surcharge:', error);
      res.status(500).json({ message: 'Failed to update transaction surcharge: ' + error.message });
    }
  });

  // Get service settings
  app.get('/api/admin/pricing/service-settings', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { service } = req.query;
      let settings;
      
      if (service && typeof service === 'string') {
        settings = await storage.getServiceSettingsByService(service);
      } else {
        settings = await storage.getAllServiceSettings();
      }
      
      res.json(settings);
    } catch (error: any) {
      console.error('Error fetching service settings:', error);
      res.status(500).json({ message: 'Failed to fetch service settings: ' + error.message });
    }
  });

  // Update service setting
  app.put('/api/admin/pricing/service-settings/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertPricingServiceSettingSchema.partial().parse(req.body);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID required' });
      }

      const updated = await storage.updateServiceSetting(parseInt(id), updateData, userId);
      
      // Clear cache after update
      await pricingConfigService.clearCache();
      
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating service setting:', error);
      res.status(500).json({ message: 'Failed to update service setting: ' + error.message });
    }
  });

  // Get pricing tiers
  app.get('/api/admin/pricing/tiers', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { service } = req.query;
      let tiers;
      
      if (service && typeof service === 'string') {
        tiers = await storage.getPricingTiersByService(service);
      } else {
        tiers = await storage.getAllPricingTiers();
      }
      
      res.json(tiers);
    } catch (error: any) {
      console.error('Error fetching pricing tiers:', error);
      res.status(500).json({ message: 'Failed to fetch pricing tiers: ' + error.message });
    }
  });

  // Update pricing tier
  app.put('/api/admin/pricing/tiers/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertPricingTierSchema.partial().parse(req.body);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID required' });
      }

      const updated = await storage.updatePricingTier(parseInt(id), updateData, userId);
      
      // Clear cache after update
      await pricingConfigService.clearCache();
      
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating pricing tier:', error);
      res.status(500).json({ message: 'Failed to update pricing tier: ' + error.message });
    }
  });

  // Get pricing history
  app.get('/api/admin/pricing/history', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { table, recordId } = req.query;
      
      const history = await storage.getPricingHistory(
        table as string | undefined,
        recordId ? parseInt(recordId as string) : undefined
      );
      
      res.json(history);
    } catch (error: any) {
      console.error('Error fetching pricing history:', error);
      res.status(500).json({ message: 'Failed to fetch pricing history: ' + error.message });
    }
  });

  // Clear pricing cache (useful for testing or forced refresh)
  app.post('/api/admin/pricing/clear-cache', requireAuth, requireAdmin, async (req, res) => {
    try {
      await pricingConfigService.clearCache();
      res.json({ message: 'Pricing cache cleared successfully' });
    } catch (error: any) {
      console.error('Error clearing pricing cache:', error);
      res.status(500).json({ message: 'Failed to clear pricing cache: ' + error.message });
    }
  });

  // ===== CALCULATOR MANAGER: SERVICE CONTENT =====
  {
    const { insertCalculatorServiceContentSchema } = await import('@shared/schema');
    const { DEFAULT_INCLUDED_FIELDS, DEFAULT_AGREEMENT_LINKS, DEFAULT_MSA_LINK, SERVICE_KEYS_DB, getDefaultSowTitle, getDefaultSowTemplate } = await import('./calculator-defaults');

    const safeParse = (s?: string | null): any => {
      if (!s) return {};
      try { return JSON.parse(s); } catch { return {}; }
    };

    const deepMerge = (base: any, override: any): any => {
      if (!override || typeof override !== 'object') return base;
      const result: any = Array.isArray(base) ? [...base] : { ...base };
      for (const key of Object.keys(override)) {
        const o = override[key];
        if (o && typeof o === 'object' && !Array.isArray(o)) {
          result[key] = deepMerge(base?.[key] || {}, o);
        } else {
          result[key] = o;
        }
      }
      return result;
    };

    const isBlank = (v: any) => typeof v === 'string' && v.trim() === '';
    const norm = (v: any) => (v === undefined || v === null || isBlank(v) ? undefined : v);
    const asDbKey = (svc: string) => (
      svc as 'bookkeeping' | 'taas' | 'payroll' | 'ap' | 'ar' | 'agent_of_service' | 'cfo_advisory'
    );
    const withDefaults = (existing: any | undefined, service: string) => {
      const included = JSON.stringify(
        deepMerge(DEFAULT_INCLUDED_FIELDS, safeParse(existing?.includedFieldsJson))
      );
      if (existing) {
        return {
          ...existing,
          sowTitle: norm(existing.sowTitle) ?? getDefaultSowTitle(service as any),
          sowTemplate: norm(existing.sowTemplate) ?? getDefaultSowTemplate(service as any),
          agreementLink: norm(existing.agreementLink) ?? (DEFAULT_AGREEMENT_LINKS[asDbKey(service)] ?? null),
          includedFieldsJson: included,
        };
      }
      return {
        id: 0,
        service,
        sowTitle: getDefaultSowTitle(service as any),
        sowTemplate: getDefaultSowTemplate(service as any),
        agreementLink: DEFAULT_AGREEMENT_LINKS[asDbKey(service)] ?? null,
        includedFieldsJson: included,
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    };

    // List all service content entries
    app.get('/api/admin/calculator/content', requireAuth, requireAdmin, async (req, res) => {
      try {
        const items = await storage.getAllCalculatorServiceContent();
        const map = new Map<string, any>((items || []).map(i => [i.service, i]));
        const merged = SERVICE_KEYS_DB.map(svc => withDefaults(map.get(svc), svc));
        const payload = { items: merged, msaLink: DEFAULT_MSA_LINK };
        const parsed = CalculatorContentResponseSchema.safeParse(payload);
        if (!parsed.success) {
          console.error('[AdminCalculatorContent] invalid payload', parsed.error.issues);
          return res.status(500).json({ status: 'error', message: 'Invalid calculator content payload' });
        }
        res.json(parsed.data);
      } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch calculator service content: ' + error.message });
      }
    });

    // Get content for a specific service
    app.get('/api/admin/calculator/content/:service', requireAuth, requireAdmin, async (req, res) => {
      try {
        const { service } = req.params;
        const existing = await storage.getCalculatorServiceContent(service);
        const payload = { item: withDefaults(existing, service), msaLink: DEFAULT_MSA_LINK };
        const parsed = CalculatorContentItemResponseSchema.safeParse(payload);
        if (!parsed.success) {
          console.error('[AdminCalculatorContent:item] invalid payload', parsed.error.issues);
          return res.status(500).json({ status: 'error', message: 'Invalid calculator content payload' });
        }
        res.json(parsed.data);
      } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch calculator service content: ' + error.message });
      }
    });

    // Upsert content for a specific service
    app.put('/api/admin/calculator/content/:service', requireAuth, requireAdmin, async (req, res) => {
      try {
        const { service } = req.params;
        const payload = insertCalculatorServiceContentSchema.partial().parse(req.body);
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: 'User ID required' });
        }
        const updated = await storage.upsertCalculatorServiceContent({ ...payload, service, updatedBy: userId });
        const resp = { item: updated };
        const parsed = CalculatorContentItemResponseSchema.safeParse({ item: { ...resp.item, createdAt: resp.item.createdAt?.toISOString?.() ?? undefined, updatedAt: resp.item.updatedAt?.toISOString?.() ?? undefined } });
        if (!parsed.success) {
          console.error('[AdminCalculatorContent:put] invalid payload', parsed.error.issues);
          return res.status(500).json({ status: 'error', message: 'Invalid calculator content payload' });
        }
        res.json(parsed.data);
      } catch (error: any) {
        res.status(500).json({ message: 'Failed to update calculator service content: ' + error.message });
      }
    });
  }


}

// Helper function for password hashing (reused from auth.ts)
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Password generation function
function generatePassword(): string {
  const adjectives = ['Quick', 'Bright', 'Swift', 'Smart', 'Bold', 'Sharp', 'Clear', 'Fresh', 'Strong', 'Wise'];
  const nouns = ['Tiger', 'Eagle', 'Wolf', 'Falcon', 'Lion', 'Shark', 'Bear', 'Fox', 'Hawk', 'Lynx'];
  const numbers = Math.floor(Math.random() * 900) + 100; // 3-digit number
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${adjective}${noun}${numbers}!`;
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { HubSpotService } from "./hubspot";
import type Redis from "ioredis";
import RedisStore from "connect-redis";
import MemoryStore from "memorystore";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // Check if this is a bcrypt hash (starts with $2a$, $2b$, or $2y$)
  if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
    // Use bcrypt for comparison
    const bcrypt = await import('bcryptjs');
    return await bcrypt.compare(supplied, stored);
  }
  
  // Legacy scrypt hash format (hash.salt)
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) {
    throw new Error('Invalid password hash format');
  }
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function setupAuth(app: Express, sessionRedis?: Redis | null) {
  // Auth setup simplified with centralized session handling
  // Initialize HubSpot service for user verification
  let hubSpotService: HubSpotService | null = null;
  try {
    hubSpotService = new HubSpotService();
  } catch (error) {
    console.warn('HubSpot service not available for user verification:', error);
  }

  // Require SESSION_SECRET in production
  if (!process.env.SESSION_SECRET) {
    console.error('CRITICAL: SESSION_SECRET environment variable is not set!');
    console.error('Generate a secure secret with: openssl rand -base64 32');
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET is required in production');
    }
    // Development warning but allow to continue
    console.warn('Using insecure default session secret - DO NOT USE IN PRODUCTION');
  }

  // Session setup is centralized, now configuring passport strategies

  // Session middleware is applied centrally at startup
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: 'email' }, // Use email as username field
      async (email, password, done) => {
        try {
          let user = await storage.getUserByEmail(email);
          
          // If user doesn't exist, create them automatically for verified @seedfinancial.io emails
          if (!user) {
                  // Validate email domain
            if (!email.endsWith('@seedfinancial.io')) {
              return done(null, false);
            }

            // Verify user exists in HubSpot (skip for development testing)
            if (hubSpotService && process.env.NODE_ENV === 'production') {
              try {
                const hubSpotUserExists = await hubSpotService.verifyUserByEmail(email);
                if (!hubSpotUserExists) {
                  console.log(`Email ${email} not found in HubSpot - access denied`);
                  return done(null, false);
                }
                console.log(`Email ${email} verified in HubSpot`);
              } catch (error) {
                console.error(`HubSpot verification failed for ${email}:`, error);
                return done(null, false);
              }
            } else {
              console.log(`Development mode: Skipping HubSpot verification for new user ${email}`);
            }

            // Create user automatically with default password and role assignment
            console.log(`Creating new user for ${email} with default password`);
            
            // Create user with default employee role (admin can manually assign admin role later)
            let role = 'employee'; // Default role for all new users
            // Hardcode jon@seedfinancial.io as permanent admin to bootstrap the system
            if (email === 'jon@seedfinancial.io') {
              role = 'admin';
            }
            
            try {
              user = await storage.createUser({
                email,
                password: await hashPassword('SeedAdmin1!'), // Default password
                firstName: '',
                lastName: '',
                hubspotUserId: null,
                role,
              });
              console.log(`Successfully created user with ID: ${user.id}`);
            } catch (createError: any) {
              // Handle race condition - if another request created the user first
              if (createError.code === '23505' || createError.message?.includes('unique constraint')) {
                console.log(`User creation race condition detected for ${email}, fetching existing user`);
                user = await storage.getUserByEmail(email);
                if (!user) {
                  console.error(`Failed to fetch user after race condition for ${email}`);
                  return done(null, false);
                }
              } else {
                console.error(`Failed to create user for ${email}:`, createError);
                return done(createError);
              }
            }
          } else {
            // Ensure jon@seedfinancial.io always has admin role (hardcoded protection)
            if (user.email === 'jon@seedfinancial.io' && user.role !== 'admin') {
              console.log(`Updating jon@seedfinancial.io role from ${user.role} to admin`);
              user = await storage.updateUserRole(user.id, 'admin', user.id);
            }
            
            // For existing users, also verify they still exist in HubSpot (skip for local testing)
            if (hubSpotService && process.env.NODE_ENV === 'production') {
              try {
                const hubSpotUserExists = await hubSpotService.verifyUserByEmail(email);
                if (!hubSpotUserExists) {
                  console.log(`Existing user ${email} no longer found in HubSpot - access denied`);
                  return done(null, false);
                }
              } catch (error) {
                console.error(`HubSpot verification failed for existing user ${email}:`, error);
                return done(null, false);
              }
            } else {
              console.log(`Development mode: Skipping HubSpot verification for existing user ${email}`);
            }
          }
          
          // Check password
          if (!user.password || !(await comparePasswords(password, user.password))) {
            return done(null, false);
          }
          
          return done(null, user);
        } catch (error) {
          console.error('Authentication error:', error);
          return done(error);
        }
      }
    ),
  );

  passport.serializeUser((user, done) => {
    console.log('🔄 [PASSPORT] Serializing user:', {
      email: user.email,
      id: user.id,
      role: user.role,
      userKeys: Object.keys(user),
      timestamp: new Date().toISOString()
    });
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    console.log('🔄 [PASSPORT] Deserializing user ID:', {
      id,
      idType: typeof id,
      timestamp: new Date().toISOString()
    });
    
    try {
      const user = await storage.getUser(id);
      if (user) {
        console.log('🔄 [PASSPORT] ✅ Deserialized user successfully:', {
          email: user.email,
          id: user.id,
          role: user.role,
          userKeys: Object.keys(user)
        });
        done(null, user);
      } else {
        console.log('🔄 [PASSPORT] ❌ User not found for ID:', {
          attemptedId: id,
          idType: typeof id,
          timestamp: new Date().toISOString()
        });
        done(null, null);
      }
    } catch (error) {
      console.error('🔄 [PASSPORT] ❌ Deserialization error:', {
        error: error.message,
        userId: id,
        stack: error.stack?.split('\n').slice(0, 3),
        timestamp: new Date().toISOString()
      });
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Validate email domain
      if (!email.endsWith('@seedfinancial.io')) {
        return res.status(400).json({ 
          message: "Only @seedfinancial.io email addresses are allowed" 
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Verify user exists in HubSpot
      if (!hubSpotService) {
        return res.status(500).json({ message: "HubSpot service not available" });
      }
      
      const hubspotVerification = await hubSpotService.verifyUser(email);
      if (!hubspotVerification.exists) {
        return res.status(400).json({ 
          message: "Email not found in HubSpot. Please contact your administrator." 
        });
      }

      // Create user with HubSpot data
      const user = await storage.createUser({
        email,
        password: await hashPassword(password || 'SeedAdmin1!'), // Use provided password or default
        firstName: hubspotVerification.userData?.firstName || '',
        lastName: hubspotVerification.userData?.lastName || '',
        hubspotUserId: hubspotVerification.userData?.hubspotUserId || null,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        });
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", async (req, res, next) => {
    console.log('🔐 /api/login endpoint called');
    console.log('🔐 Request body keys:', Object.keys(req.body));
    console.log('🔐 Has googleAccessToken:', !!req.body.googleAccessToken);
    console.log('🔐 Has googleCredential:', !!req.body.googleCredential);
    console.log('🔐 User-Agent:', req.headers['user-agent']);
    console.log('🔐 Referer:', req.headers.referer);
    
    // Handle Google OAuth credential (JWT ID Token) login
    if (req.body.googleCredential) {
      console.log('🔍 Google OAuth credential login detected, processing JWT...');
      console.log('🔍 Credential length:', req.body.googleCredential.length);
      try {
        const credential = req.body.googleCredential;
        
        // Verify the JWT credential with Google's tokeninfo endpoint
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`, {
          signal: AbortSignal.timeout(10000),
        });
        
        if (!response.ok) {
          console.error('❌ Google credential verification failed:', response.status, response.statusText);
          return res.status(401).json({ message: "Invalid Google credential" });
        }

        const userInfo = await response.json();
        console.log('✅ Google credential verified for:', userInfo.email);
        
        // Check domain restriction
        if (userInfo.hd !== 'seedfinancial.io') {
          console.log('❌ Domain restriction failed:', userInfo.hd);
          return res.status(403).json({ 
            message: "Access restricted to @seedfinancial.io domain" 
          });
        }

        // Get or create user
        let user = await storage.getUserByEmail(userInfo.email);
        
        if (!user) {
          console.log('🆕 Creating new user for:', userInfo.email);
          // Determine role - admin for jon@seedfinancial.io, service for others
          let role = 'service';
          if (userInfo.email === 'jon@seedfinancial.io') {
            role = 'admin';
          }
          
          user = await storage.createUser({
            email: userInfo.email,
            password: await hashPassword('oauth-google-' + Date.now()),
            firstName: userInfo.given_name || '',
            lastName: userInfo.family_name || '',
            profilePhoto: userInfo.picture || null,
            googleId: userInfo.sub,
            authProvider: 'google',
            role,
            hubspotUserId: null,
          });
          console.log('✅ User created with ID:', user.id);
        } else {
          console.log('👤 Existing user found:', user.email);
          // Update Google info if needed
          if (userInfo.sub && userInfo.sub !== user.googleId) {
            await storage.updateUserGoogleId(user.id, userInfo.sub, 'google', userInfo.picture || null);
          }
          
          // Update profile if needed
          const updates: any = {};
          if (userInfo.given_name && userInfo.given_name !== user.firstName) {
            updates.firstName = userInfo.given_name;
          }
          if (userInfo.family_name && userInfo.family_name !== user.lastName) {
            updates.lastName = userInfo.family_name;
          }
          if (userInfo.picture && userInfo.picture !== user.profilePhoto) {
            updates.profilePhoto = userInfo.picture;
          }
          
          if (Object.keys(updates).length > 0) {
            await storage.updateUserProfile(user.id, updates);
          }
        }

        // Create session
        req.login(user, (err) => {
          if (err) {
            console.error('❌ Session creation failed:', err);
            return res.status(500).json({ message: "Session creation failed" });
          }
          
          console.log('✅ User logged in successfully:', user.email);
          res.json({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            profilePhoto: user.profilePhoto,
            authMethod: 'google-credential'
          });
        });
        
      } catch (error) {
        console.error('❌ Google credential login error:', error);
        res.status(500).json({ message: "Authentication failed", error: error.message });
      }
      return; // Exit early for credential flow
    }


    // Handle traditional email/password login
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(200).json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    console.log('🚪 Session logout endpoint called');
    console.log('🚪 Session ID before logout:', req.sessionID);
    console.log('🚪 User before logout:', req.user ? req.user.email : 'None');
    
    req.logout((err) => {
      if (err) {
        console.error('❌ Session logout error:', err);
        return next(err);
      }
      
      console.log('✅ Session logout successful');
      console.log('🚪 Session destroyed, user logged out');
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    console.log('🔐 /api/user endpoint called');
    console.log('🔐 Session ID:', req.sessionID);
    console.log('🔐 Session exists:', !!req.session);
    console.log('🔐 Session store type:', req.sessionStore?.constructor?.name || 'Unknown');
    console.log('🔐 Session data keys:', Object.keys(req.session || {}));
    console.log('🔐 Authenticated:', req.isAuthenticated ? req.isAuthenticated() : 'Unknown');
    console.log('🔐 User:', req.user ? req.user.email : 'None');
    console.log('🔐 Session passport:', req.session?.passport || 'None');
    
    if (!req.isAuthenticated()) {
      console.log('❌ User not authenticated, returning 401');
      return res.sendStatus(401);
    }
    
    console.log('✅ User authenticated, returning user data');
    res.json({
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      role: req.user.role,
      profilePhoto: req.user.profilePhoto,
      phoneNumber: req.user.phoneNumber,
      address: req.user.address,
      city: req.user.city,
      state: req.user.state,
      zipCode: req.user.zipCode,
      country: req.user.country,
      latitude: req.user.latitude,
      longitude: req.user.longitude,
      lastWeatherUpdate: req.user.lastWeatherUpdate,
      lastHubspotSync: req.user.lastHubspotSync,
      defaultDashboard: req.user.defaultDashboard,
      isImpersonating: req.session.isImpersonating || false,
      originalUser: req.session.originalUser || null
    });
  });





  // Test endpoint for HubSpot verification
  app.post("/api/test-hubspot", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      if (!hubSpotService) {
        return res.status(500).json({ message: "HubSpot service not available" });
      }
      
      const result = await hubSpotService.verifyUser(email);
      res.json(result);
    } catch (error: any) {
      console.error('HubSpot test error:', error);
      res.status(500).json({ message: "HubSpot test failed", error: error.message });
    }
  });
  
  // TEMPORARY: Add quote creation route directly to auth.ts to bypass routes.ts loading issue
  app.post("/api/quotes", requireAuth, async (req, res) => {
    console.log('🚀 TEMPORARY QUOTE ROUTE HIT - This route is in auth.ts');
    console.log('Request body keys:', Object.keys(req.body || {}));
    console.log('User:', req.user?.email);
    
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Import storage here since it might not be available in the auth module scope
      const { storage } = await import('./storage');

      // Use the frontend-calculated values directly
      const quoteData = {
        ...req.body,
        ownerId: req.user.id,
        monthlyFee: req.body.monthlyFee || "0",
        setupFee: req.body.setupFee || "0", 
        taasMonthlyFee: req.body.taasMonthlyFee || "0",
        taasPriorYearsFee: req.body.taasPriorYearsFee || "0",
        monthlyTransactions: req.body.monthlyTransactions || "N/A",
        cleanupComplexity: req.body.cleanupComplexity || "0",
        cleanupMonths: req.body.cleanupMonths || 0,
        monthlyRevenueRange: req.body.monthlyRevenueRange || "Not specified",
        industry: req.body.industry || "Not specified",
        accountingBasis: req.body.accountingBasis || "Cash"
      };

      console.log('Calling storage.createQuote...');
      const quote = await storage.createQuote(quoteData);
      console.log('Quote created successfully:', quote?.id);
      
      res.json(quote);
    } catch (error) {
      console.error('Quote creation error:', error);
      res.status(500).json({ message: "Failed to create quote" });
    }
  });
}

// Middleware to require authentication (session-based only)
export async function requireAuth(req: any, res: any, next: any) {
  console.log('requireAuth: Checking authentication for', req.url);
  console.log('requireAuth: Session authenticated:', req.isAuthenticated());
  console.log('requireAuth: Auth header present:', !!req.headers.authorization);
  
  // Check session-based auth only
  if (req.isAuthenticated()) {
    console.log('requireAuth: Session auth successful for', req.user?.email);
    return next();
  }
  
  console.log('requireAuth: Authentication failed - no valid session');
  return res.status(401).json({ message: "Authentication required" });
}
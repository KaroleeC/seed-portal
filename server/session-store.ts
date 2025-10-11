/**
 * Postgres Session Store Configuration
 * 
 * Uses connect-pg-simple to store sessions in Postgres instead of Redis.
 * Sessions are only used for impersonation and special admin features.
 * Regular auth uses Supabase JWT (stateless).
 */

import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './db';

const PgSession = connectPgSimple(session);

export const sessionStore = new PgSession({
  pool: pool,
  tableName: 'user_sessions',
  createTableIfMissing: true, // Auto-creates the session table
  pruneSessionInterval: 60 * 15, // Cleanup old sessions every 15 min
});

export const sessionMiddleware = session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax',
  },
  name: 'seedos.sid', // Custom session cookie name
});

/**
 * Session will auto-create this table schema:
 * 
 * CREATE TABLE user_sessions (
 *   sid varchar NOT NULL PRIMARY KEY,
 *   sess json NOT NULL,
 *   expire timestamp(6) NOT NULL
 * );
 * CREATE INDEX IF NOT EXISTS idx_session_expire ON user_sessions (expire);
 */

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (managed by NextAuth)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User accounts table for multiple Gmail connections
CREATE TABLE IF NOT EXISTS user_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gmail_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  picture TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, gmail_id)
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Emails table
CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY, -- Gmail message ID
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  sender TEXT NOT NULL,
  snippet TEXT,
  ai_summary TEXT,
  email_body TEXT, -- Full email content
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  gmail_thread_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email processing jobs table
CREATE TABLE IF NOT EXISTS email_processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  emails_processed INTEGER DEFAULT 0,
  total_emails INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unsubscribe jobs table
CREATE TABLE IF NOT EXISTS unsubscribe_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_id TEXT NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  unsubscribe_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table (for NextAuth)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  session_token TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accounts table (for NextAuth OAuth)
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

-- Verification tokens table (for NextAuth)
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id ON user_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_last_sync ON user_accounts(last_sync);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_account_id ON emails(account_id);
CREATE INDEX IF NOT EXISTS idx_emails_category_id ON emails(category_id);
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_is_read ON emails(is_read);
CREATE INDEX IF NOT EXISTS idx_emails_is_archived ON emails(is_archived);
CREATE INDEX IF NOT EXISTS idx_email_processing_jobs_user_id ON email_processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_jobs_user_id ON unsubscribe_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_body_search ON emails USING gin(to_tsvector('english', email_body));

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE unsubscribe_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for users table
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid()::text = id);
CREATE POLICY "Users can insert own data" ON users FOR INSERT WITH CHECK (auth.uid()::text = id);

-- RLS policies for user_accounts table
CREATE POLICY "Users can view own accounts" ON user_accounts FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own accounts" ON user_accounts FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own accounts" ON user_accounts FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own accounts" ON user_accounts FOR DELETE USING (auth.uid()::text = user_id);

-- RLS policies for categories table
CREATE POLICY "Users can view own categories" ON categories FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own categories" ON categories FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own categories" ON categories FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own categories" ON categories FOR DELETE USING (auth.uid()::text = user_id);

-- RLS policies for emails table
CREATE POLICY "Users can view own emails" ON emails FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own emails" ON emails FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own emails" ON emails FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own emails" ON emails FOR DELETE USING (auth.uid()::text = user_id);

-- RLS policies for email_processing_jobs table
CREATE POLICY "Users can view own processing jobs" ON email_processing_jobs FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own processing jobs" ON email_processing_jobs FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own processing jobs" ON email_processing_jobs FOR UPDATE USING (auth.uid()::text = user_id);

-- RLS policies for unsubscribe_jobs table
CREATE POLICY "Users can view own unsubscribe jobs" ON unsubscribe_jobs FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own unsubscribe jobs" ON unsubscribe_jobs FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own unsubscribe jobs" ON unsubscribe_jobs FOR UPDATE USING (auth.uid()::text = user_id);

-- RLS policies for sessions table
CREATE POLICY "Users can view own sessions" ON sessions FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own sessions" ON sessions FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own sessions" ON sessions FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own sessions" ON sessions FOR DELETE USING (auth.uid()::text = user_id);

-- RLS policies for accounts table
CREATE POLICY "Users can view own accounts" ON accounts FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own accounts" ON accounts FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own accounts" ON accounts FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own accounts" ON accounts FOR DELETE USING (auth.uid()::text = user_id);

-- RLS policies for verification_tokens table
CREATE POLICY "Anyone can view verification tokens" ON verification_tokens FOR SELECT USING (true);
CREATE POLICY "Anyone can insert verification tokens" ON verification_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete verification tokens" ON verification_tokens FOR DELETE USING (true);

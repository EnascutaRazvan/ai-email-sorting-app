-- Enhanced database schema with all new requirements

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

-- User settings table for preferences
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  auto_sync_enabled BOOLEAN DEFAULT TRUE,
  emails_per_page INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
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
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Email categories junction table for multiple categories per email
CREATE TABLE IF NOT EXISTS email_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_id TEXT NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  is_ai_suggested BOOLEAN DEFAULT FALSE,
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(email_id, category_id)
);

-- Emails table
CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY, -- Gmail message ID
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  sender TEXT NOT NULL,
  sender_email TEXT,
  snippet TEXT,
  ai_summary TEXT,
  email_body TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT TRUE, -- All imported emails are archived from Gmail
  gmail_thread_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email processing jobs table
CREATE TABLE IF NOT EXISTS email_processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES user_accounts(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  emails_processed INTEGER DEFAULT 0,
  total_emails INTEGER DEFAULT 0,
  date_from TIMESTAMP WITH TIME ZONE,
  date_to TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id ON user_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_last_sync ON user_accounts(last_sync);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_email_categories_email_id ON email_categories(email_id);
CREATE INDEX IF NOT EXISTS idx_email_categories_category_id ON email_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_account_id ON emails(account_id);
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_sender_email ON emails(sender_email);
CREATE INDEX IF NOT EXISTS idx_emails_is_read ON emails(is_read);
CREATE INDEX IF NOT EXISTS idx_email_processing_jobs_user_id ON email_processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_body_search ON emails USING gin(to_tsvector('english', email_body));

-- Function to create default categories for new users
CREATE OR REPLACE FUNCTION create_default_categories(p_user_id TEXT)
RETURNS VOID AS $$
DECLARE
  default_categories JSON[] := ARRAY[
    '{"name": "Personal", "description": "Personal emails from friends and family", "color": "#10B981", "is_default": true}',
    '{"name": "Work", "description": "Work-related emails and communications", "color": "#3B82F6", "is_default": true}',
    '{"name": "Shopping", "description": "E-commerce, receipts, and shopping-related emails", "color": "#F59E0B", "is_default": true}',
    '{"name": "Promotions", "description": "Marketing emails, deals, and promotional content", "color": "#EF4444", "is_default": true}',
    '{"name": "Social", "description": "Social media notifications and updates", "color": "#8B5CF6", "is_default": true}',
    '{"name": "Newsletters", "description": "Newsletters, blogs, and subscription content", "color": "#06B6D4", "is_default": true}',
    '{"name": "Uncategorized", "description": "Emails that haven''t been categorized yet", "color": "#6B7280", "is_default": true}'
  ];
  category_data JSON;
BEGIN
  FOREACH category_data IN ARRAY default_categories
  LOOP
    INSERT INTO categories (user_id, name, description, color, is_default)
    VALUES (
      p_user_id,
      category_data->>'name',
      category_data->>'description',
      category_data->>'color',
      (category_data->>'is_default')::BOOLEAN
    )
    ON CONFLICT (user_id, name) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to ensure uncategorized category exists
CREATE OR REPLACE FUNCTION ensure_uncategorized_category(p_user_id TEXT)
RETURNS UUID AS $$
DECLARE
  category_id UUID;
BEGIN
  SELECT id INTO category_id
  FROM categories
  WHERE user_id = p_user_id AND name = 'Uncategorized';
  
  IF category_id IS NULL THEN
    INSERT INTO categories (user_id, name, description, color, is_default)
    VALUES (p_user_id, 'Uncategorized', 'Emails that haven''t been categorized yet', '#6B7280', true)
    RETURNING id INTO category_id;
  END IF;
  
  RETURN category_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get email count per category
CREATE OR REPLACE FUNCTION get_category_email_counts(p_user_id TEXT)
RETURNS TABLE(category_id UUID, email_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as category_id,
    COALESCE(COUNT(ec.email_id), 0) as email_count
  FROM categories c
  LEFT JOIN email_categories ec ON c.id = ec.category_id
  LEFT JOIN emails e ON ec.email_id = e.id
  WHERE c.user_id = p_user_id
  GROUP BY c.id;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_processing_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_settings table
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid()::text = user_id);

-- RLS policies for email_categories table
CREATE POLICY "Users can view own email categories" ON email_categories FOR SELECT USING (
  EXISTS (SELECT 1 FROM emails WHERE emails.id = email_categories.email_id AND emails.user_id = auth.uid()::text)
);
CREATE POLICY "Users can insert own email categories" ON email_categories FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM emails WHERE emails.id = email_categories.email_id AND emails.user_id = auth.uid()::text)
);
CREATE POLICY "Users can update own email categories" ON email_categories FOR UPDATE USING (
  EXISTS (SELECT 1 FROM emails WHERE emails.id = email_categories.email_id AND emails.user_id = auth.uid()::text)
);
CREATE POLICY "Users can delete own email categories" ON email_categories FOR DELETE USING (
  EXISTS (SELECT 1 FROM emails WHERE emails.id = email_categories.email_id AND emails.user_id = auth.uid()::text)
);

-- Update existing RLS policies
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can view own accounts" ON user_accounts;
DROP POLICY IF EXISTS "Users can insert own accounts" ON user_accounts;
DROP POLICY IF EXISTS "Users can update own accounts" ON user_accounts;
DROP POLICY IF EXISTS "Users can delete own accounts" ON user_accounts;
DROP POLICY IF EXISTS "Users can view own categories" ON categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON categories;
DROP POLICY IF EXISTS "Users can update own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON categories;
DROP POLICY IF EXISTS "Users can view own emails" ON emails;
DROP POLICY IF EXISTS "Users can insert own emails" ON emails;
DROP POLICY IF EXISTS "Users can update own emails" ON emails;
DROP POLICY IF EXISTS "Users can delete own emails" ON emails;
DROP POLICY IF EXISTS "Users can view own processing jobs" ON email_processing_jobs;
DROP POLICY IF EXISTS "Users can insert own processing jobs" ON email_processing_jobs;
DROP POLICY IF EXISTS "Users can update own processing jobs" ON email_processing_jobs;

CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid()::text = id);

CREATE POLICY "Users can view own accounts" ON user_accounts FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own accounts" ON user_accounts FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own accounts" ON user_accounts FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own accounts" ON user_accounts FOR DELETE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own categories" ON categories FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own categories" ON categories FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own categories" ON categories FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own categories" ON categories FOR DELETE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own emails" ON emails FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own emails" ON emails FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own emails" ON emails FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own emails" ON emails FOR DELETE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own processing jobs" ON email_processing_jobs FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own processing jobs" ON email_processing_jobs FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own processing jobs" ON email_processing_jobs FOR UPDATE USING (auth.uid()::text = user_id);

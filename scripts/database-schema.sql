-- Create users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_accounts table for connected email accounts (e.g., Gmail)
CREATE TABLE user_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    provider TEXT NOT NULL, -- e.g., 'google'
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_sync_history_id TEXT, -- For Gmail API incremental sync
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, email) -- Ensure a user can only connect an email once
);

-- Create categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL, -- Hex color code for UI
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name) -- Ensure unique category names per user
);

-- Create emails table
CREATE TABLE emails (
    id TEXT PRIMARY KEY, -- Gmail message ID
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    thread_id TEXT NOT NULL, -- Gmail thread ID
    subject TEXT,
    sender TEXT,
    sender_email TEXT,
    snippet TEXT,
    full_content TEXT, -- Store full HTML/plain text content
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL, -- Allow null for uncategorized
    is_ai_suggested BOOLEAN DEFAULT FALSE, -- Whether categorization was AI-suggested
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster queries
CREATE INDEX idx_emails_user_id ON emails(user_id);
CREATE INDEX idx_emails_account_id ON emails(account_id);
CREATE INDEX idx_emails_category_id ON emails(category_id);
CREATE INDEX idx_emails_received_at ON emails(received_at DESC);
CREATE INDEX idx_emails_sender_email ON emails(sender_email);
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_user_accounts_user_id ON user_accounts(user_id);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own user data." ON users FOR SELECT USING (auth.uid() = id);

-- RLS Policies for user_accounts table
CREATE POLICY "Users can view their own accounts." ON user_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own accounts." ON user_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own accounts." ON user_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own accounts." ON user_accounts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for categories table
CREATE POLICY "Users can view their own categories." ON categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own categories." ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own categories." ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own categories." ON categories FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for emails table
CREATE POLICY "Users can view their own emails." ON emails FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own emails." ON emails FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own emails." ON emails FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own emails." ON emails FOR DELETE USING (auth.uid() = user_id);

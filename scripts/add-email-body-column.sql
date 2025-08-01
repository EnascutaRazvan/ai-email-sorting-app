-- Migration script to add missing columns to emails table
-- Run this if you're getting "Could not find the 'email_body' column" error

DO $$
BEGIN
  -- Add email_body column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'emails' AND column_name = 'email_body'
  ) THEN
    ALTER TABLE emails ADD COLUMN email_body TEXT;
    RAISE NOTICE 'Added email_body column to emails table';
  ELSE
    RAISE NOTICE 'email_body column already exists';
  END IF;

  -- Add is_archived column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'emails' AND column_name = 'is_archived'
  ) THEN
    ALTER TABLE emails ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added is_archived column to emails table';
  ELSE
    RAISE NOTICE 'is_archived column already exists';
  END IF;
END $$;

-- Create full-text search indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_emails_body_search 
ON emails USING gin(to_tsvector('english', email_body));

CREATE INDEX IF NOT EXISTS idx_emails_subject_search 
ON emails USING gin(to_tsvector('english', subject));

CREATE INDEX IF NOT EXISTS idx_emails_sender_search 
ON emails USING gin(to_tsvector('english', sender));

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_emails_user_archived 
ON emails(user_id, is_archived);

CREATE INDEX IF NOT EXISTS idx_emails_user_read_received 
ON emails(user_id, is_read, received_at DESC);

RAISE NOTICE 'Migration completed successfully!';

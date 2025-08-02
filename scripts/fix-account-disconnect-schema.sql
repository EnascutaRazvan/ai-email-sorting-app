-- First, add the disconnected_account_email column if it doesn't exist
ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS disconnected_account_email TEXT;

-- Remove the NOT NULL constraint from account_id to allow disconnected emails
ALTER TABLE emails 
ALTER COLUMN account_id DROP NOT NULL;

-- Add index for better performance when querying disconnected emails
CREATE INDEX IF NOT EXISTS idx_emails_disconnected_account ON emails(disconnected_account_email) WHERE disconnected_account_email IS NOT NULL;

-- Add index for emails with null account_id (disconnected emails)
CREATE INDEX IF NOT EXISTS idx_emails_null_account ON emails(user_id, account_id) WHERE account_id IS NULL;

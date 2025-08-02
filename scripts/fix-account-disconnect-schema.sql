-- Add the disconnected_account_email column if it doesn't exist
ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS disconnected_account_email TEXT;

-- Remove the NOT NULL constraint from account_id to allow null values
ALTER TABLE emails 
ALTER COLUMN account_id DROP NOT NULL;

-- Add index for better performance on disconnected account queries
CREATE INDEX IF NOT EXISTS idx_emails_disconnected_account 
ON emails(user_id, disconnected_account_email) 
WHERE disconnected_account_email IS NOT NULL;

-- Add index for account_id queries (including null values)
CREATE INDEX IF NOT EXISTS idx_emails_account_id_null 
ON emails(user_id, account_id);

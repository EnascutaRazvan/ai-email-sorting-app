-- Add field to track emails from disconnected accounts
ALTER TABLE emails 
ADD COLUMN disconnected_account_email TEXT;

-- Add index for better performance when querying disconnected emails
CREATE INDEX idx_emails_disconnected_account ON emails(disconnected_account_email) WHERE disconnected_account_email IS NOT NULL;

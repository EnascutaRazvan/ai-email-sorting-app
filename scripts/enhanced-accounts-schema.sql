-- Enhanced user_accounts table with additional fields for better account management
ALTER TABLE user_accounts 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS picture TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scope TEXT;

-- Update existing records to have proper timestamps
UPDATE user_accounts 
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

-- Add index for better performance on token expiration queries
CREATE INDEX IF NOT EXISTS idx_user_accounts_token_expires 
ON user_accounts(token_expires_at) 
WHERE token_expires_at IS NOT NULL;

-- Add index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id 
ON user_accounts(user_id);

-- Add constraint to ensure primary account exists
CREATE OR REPLACE FUNCTION ensure_primary_account()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure at least one primary account exists per user
  IF NOT EXISTS (
    SELECT 1 FROM user_accounts 
    WHERE user_id = NEW.user_id AND is_primary = true
  ) THEN
    NEW.is_primary = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for primary account enforcement
DROP TRIGGER IF EXISTS ensure_primary_account_trigger ON user_accounts;
CREATE TRIGGER ensure_primary_account_trigger
  BEFORE INSERT ON user_accounts
  FOR EACH ROW
  EXECUTE FUNCTION ensure_primary_account();

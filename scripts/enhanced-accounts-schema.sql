-- Enhanced user_accounts table with additional OAuth fields
ALTER TABLE user_accounts 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS picture TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scope TEXT;

-- Add index for token expiration monitoring
CREATE INDEX IF NOT EXISTS idx_user_accounts_token_expires 
ON user_accounts(token_expires_at) 
WHERE token_expires_at IS NOT NULL;

-- Add index for user lookup performance
CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id_primary 
ON user_accounts(user_id, is_primary);

-- Update the accounts view to include new fields
CREATE OR REPLACE VIEW account_summary AS
SELECT 
  ua.id,
  ua.user_id,
  ua.email,
  ua.name,
  ua.picture,
  ua.is_primary,
  ua.created_at,
  ua.updated_at,
  ua.token_expires_at,
  ua.scope,
  CASE 
    WHEN ua.token_expires_at IS NULL THEN 'never'
    WHEN ua.token_expires_at < NOW() THEN 'expired'
    WHEN ua.token_expires_at < NOW() + INTERVAL '1 hour' THEN 'expiring_soon'
    ELSE 'valid'
  END as token_status
FROM user_accounts ua
ORDER BY ua.is_primary DESC, ua.created_at ASC;

-- Add a function to check for expiring tokens
CREATE OR REPLACE FUNCTION get_expiring_tokens(hours_ahead INTEGER DEFAULT 24)
RETURNS TABLE(
  user_id TEXT,
  email TEXT,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ua.user_id,
    ua.email,
    ua.token_expires_at
  FROM user_accounts ua
  WHERE ua.token_expires_at IS NOT NULL
    AND ua.token_expires_at > NOW()
    AND ua.token_expires_at < NOW() + (hours_ahead || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

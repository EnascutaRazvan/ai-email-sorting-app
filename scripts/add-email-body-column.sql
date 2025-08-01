-- Migration script to add email_body column if it doesn't exist
DO $$ 
BEGIN
    -- Check if email_body column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'emails' 
        AND column_name = 'email_body'
    ) THEN
        ALTER TABLE emails ADD COLUMN email_body TEXT;
        
        -- Add index for full-text search on email body
        CREATE INDEX IF NOT EXISTS idx_emails_body_search 
        ON emails USING gin(to_tsvector('english', email_body));
        
        RAISE NOTICE 'Added email_body column and search index to emails table';
    ELSE
        RAISE NOTICE 'email_body column already exists';
    END IF;
    
    -- Check if is_archived column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'emails' 
        AND column_name = 'is_archived'
    ) THEN
        ALTER TABLE emails ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
        
        -- Add index for archived emails
        CREATE INDEX IF NOT EXISTS idx_emails_is_archived ON emails(is_archived);
        
        RAISE NOTICE 'Added is_archived column and index to emails table';
    ELSE
        RAISE NOTICE 'is_archived column already exists';
    END IF;
END $$;

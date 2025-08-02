-- Add suggested_category_name column to emails table
ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS suggested_category_name TEXT;

-- Add index for suggested category queries
CREATE INDEX IF NOT EXISTS idx_emails_suggested_category 
ON emails(suggested_category_name) 
WHERE suggested_category_name IS NOT NULL;

-- Add a view to get emails with their suggested categories
CREATE OR REPLACE VIEW emails_with_suggestions AS
SELECT 
  e.*,
  c.name as category_name,
  c.color as category_color,
  c.description as category_description,
  CASE 
    WHEN e.category_id IS NULL AND e.suggested_category_name IS NOT NULL 
    THEN TRUE 
    ELSE FALSE 
  END as has_suggestion
FROM emails e
LEFT JOIN categories c ON e.category_id = c.id;

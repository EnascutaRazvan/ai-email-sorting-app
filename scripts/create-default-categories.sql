-- Create default categories for existing users who don't have any categories yet

INSERT INTO categories (user_id, name, color, description, is_default)
SELECT 
  u.id as user_id,
  category_data.name,
  category_data.color,
  category_data.description,
  TRUE as is_default
FROM users u
CROSS JOIN (
  VALUES 
    ('Work', '#3B82F6', 'Work-related emails and professional correspondence'),
    ('Personal', '#10B981', 'Personal emails from friends and family'),
    ('Shopping', '#F59E0B', 'E-commerce, receipts, and shopping-related emails'),
    ('Newsletters', '#8B5CF6', 'Newsletters, subscriptions, and regular updates'),
    ('Promotions', '#EF4444', 'Marketing emails, deals, and promotional content'),
    ('Social', '#06B6D4', 'Social media notifications and community updates')
) AS category_data(name, color, description)
WHERE NOT EXISTS (
  SELECT 1 FROM categories c 
  WHERE c.user_id = u.id 
  AND c.name = category_data.name
)
ON CONFLICT (user_id, name) DO NOTHING;

-- Update the count of categories created
DO $$
DECLARE
  category_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO category_count FROM categories WHERE is_default = TRUE;
  RAISE NOTICE 'Created default categories. Total default categories: %', category_count;
END $$;

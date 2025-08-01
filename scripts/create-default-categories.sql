-- Create default categories for new users
INSERT INTO categories (user_id, name, description, color) 
SELECT 
    u.id,
    'Work',
    'Work-related emails and professional correspondence',
    '#3B82F6'
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.user_id = u.id AND c.name = 'Work'
);

INSERT INTO categories (user_id, name, description, color) 
SELECT 
    u.id,
    'Personal',
    'Personal emails from friends and family',
    '#10B981'
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.user_id = u.id AND c.name = 'Personal'
);

INSERT INTO categories (user_id, name, description, color) 
SELECT 
    u.id,
    'Shopping',
    'E-commerce, receipts, and shopping-related emails',
    '#F59E0B'
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.user_id = u.id AND c.name = 'Shopping'
);

INSERT INTO categories (user_id, name, description, color) 
SELECT 
    u.id,
    'Newsletters',
    'Newsletters, updates, and subscription emails',
    '#8B5CF6'
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.user_id = u.id AND c.name = 'Newsletters'
);

INSERT INTO categories (user_id, name, description, color) 
SELECT 
    u.id,
    'Promotions',
    'Marketing emails, deals, and promotional content',
    '#EF4444'
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.user_id = u.id AND c.name = 'Promotions'
);

INSERT INTO categories (user_id, name, description, color) 
SELECT 
    u.id,
    'Social',
    'Social media notifications and updates',
    '#06B6D4'
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.user_id = u.id AND c.name = 'Social'
);

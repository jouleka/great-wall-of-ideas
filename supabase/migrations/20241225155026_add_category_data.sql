-- Insert main categories first
INSERT INTO categories (name, slug, description, type, icon) VALUES
-- Technology & Innovation
('Technology', 'technology', 'Tech innovations and digital solutions', 'technology', 'Monitor'),
('Business', 'business', 'Business and entrepreneurship ideas', 'business', 'Building'),
('Creative', 'creative', 'Creative and artistic projects', 'creative', 'Palette'),
('Social Impact', 'social-impact', 'Ideas for social good', 'social_impact', 'Heart'),
('Education', 'education', 'Educational innovations and learning solutions', 'education', 'GraduationCap'),
('Health', 'health', 'Healthcare and wellness innovations', 'health', 'Stethoscope'),
('Entertainment', 'entertainment', 'Entertainment and media ideas', 'entertainment', 'Film'),
('Environment', 'environment', 'Environmental and sustainability solutions', 'other', 'Leaf');

-- Insert subcategories with their parent_ids
DO $$ 
DECLARE 
    tech_id UUID;
    business_id UUID;
    creative_id UUID;
    social_id UUID;
    education_id UUID;
    health_id UUID;
    entertainment_id UUID;
    environment_id UUID;
BEGIN
    -- Get parent category IDs
    SELECT id INTO tech_id FROM categories WHERE slug = 'technology';
    SELECT id INTO business_id FROM categories WHERE slug = 'business';
    SELECT id INTO creative_id FROM categories WHERE slug = 'creative';
    SELECT id INTO social_id FROM categories WHERE slug = 'social-impact';
    SELECT id INTO education_id FROM categories WHERE slug = 'education';
    SELECT id INTO health_id FROM categories WHERE slug = 'health';
    SELECT id INTO entertainment_id FROM categories WHERE slug = 'entertainment';
    SELECT id INTO environment_id FROM categories WHERE slug = 'environment';

    -- Insert subcategories for Technology
    INSERT INTO categories (name, slug, description, type, icon, parent_id) VALUES
    ('Software & Apps', 'software-apps', 'Mobile and web applications', 'technology', 'Code', tech_id),
    ('Hardware & Gadgets', 'hardware', 'Physical tech and devices', 'technology', 'Cpu', tech_id),
    ('AI & Machine Learning', 'ai-ml', 'Artificial Intelligence solutions', 'technology', 'Brain', tech_id),
    ('Blockchain', 'blockchain', 'Blockchain and cryptocurrency innovations', 'technology', 'Link', tech_id),
    ('IoT & Connected Devices', 'iot', 'Internet of Things solutions', 'technology', 'Signal', tech_id),
    ('Cloud Computing', 'cloud', 'Cloud services and solutions', 'technology', 'Cloud', tech_id),
    ('Cybersecurity', 'cybersecurity', 'Security and privacy solutions', 'technology', 'Shield', tech_id),
    ('DevOps & Infrastructure', 'devops', 'Development operations and infrastructure', 'technology', 'Settings', tech_id);

    -- Insert subcategories for Business
    INSERT INTO categories (name, slug, description, type, icon, parent_id) VALUES
    ('Startups', 'startups', 'Startup concepts and ventures', 'business', 'Rocket', business_id),
    ('E-commerce', 'ecommerce', 'Online business and retail', 'business', 'ShoppingCart', business_id),
    ('Services', 'services', 'Service-based business ideas', 'business', 'HeartHandshake', business_id),
    ('FinTech', 'fintech', 'Financial technology solutions', 'business', 'Wallet', business_id),
    ('Marketing', 'marketing', 'Marketing and advertising innovations', 'business', 'Target', business_id),
    ('Real Estate', 'real-estate', 'Property and real estate solutions', 'business', 'Home', business_id),
    ('Productivity', 'productivity', 'Business productivity tools', 'business', 'Timer', business_id),
    ('HR & Recruitment', 'hr', 'Human resources solutions', 'business', 'Users', business_id);

    -- Insert subcategories for Creative
    INSERT INTO categories (name, slug, description, type, icon, parent_id) VALUES
    ('Games', 'games', 'Gaming and interactive entertainment', 'creative', 'Gamepad', creative_id),
    ('Design', 'design', 'Design and visual arts', 'creative', 'Pen', creative_id),
    ('Media', 'media', 'Media and content creation', 'creative', 'Film', creative_id),
    ('Music', 'music', 'Music and audio innovations', 'creative', 'Music', creative_id),
    ('Writing', 'writing', 'Writing and publishing solutions', 'creative', 'PenTool', creative_id),
    ('Art', 'art', 'Digital and traditional art', 'creative', 'Palette', creative_id),
    ('Animation', 'animation', 'Animation and motion graphics', 'creative', 'Video', creative_id),
    ('Photography', 'photography', 'Photography and imaging', 'creative', 'Camera', creative_id);

    -- Insert subcategories for Social Impact
    INSERT INTO categories (name, slug, description, type, icon, parent_id) VALUES
    ('Community', 'community', 'Community building solutions', 'social_impact', 'Users', social_id),
    ('Non-Profit', 'non-profit', 'Non-profit initiatives', 'social_impact', 'Heart', social_id),
    ('Accessibility', 'accessibility', 'Accessibility solutions', 'social_impact', 'Accessibility', social_id),
    ('Diversity & Inclusion', 'diversity', 'Diversity and inclusion initiatives', 'social_impact', 'Users', social_id),
    ('Social Justice', 'social-justice', 'Social justice innovations', 'social_impact', 'Scale', social_id),
    ('Humanitarian', 'humanitarian', 'Humanitarian aid solutions', 'social_impact', 'HeartHandshake', social_id);

    -- Insert subcategories for Education
    INSERT INTO categories (name, slug, description, type, icon, parent_id) VALUES
    ('E-Learning', 'elearning', 'Online learning platforms', 'education', 'Laptop', education_id),
    ('EdTech', 'edtech', 'Educational technology', 'education', 'Lightbulb', education_id),
    ('Language Learning', 'language', 'Language learning solutions', 'education', 'Languages', education_id),
    ('Professional Development', 'professional-dev', 'Professional training', 'education', 'GraduationCap', education_id),
    ('Early Education', 'early-education', 'Early childhood education', 'education', 'Baby', education_id),
    ('STEM Education', 'stem', 'Science and tech education', 'education', 'Flask', education_id);

    -- Insert subcategories for Health
    INSERT INTO categories (name, slug, description, type, icon, parent_id) VALUES
    ('Digital Health', 'digital-health', 'Digital healthcare solutions', 'health', 'Activity', health_id),
    ('Mental Health', 'mental-health', 'Mental health innovations', 'health', 'Brain', health_id),
    ('Fitness', 'fitness', 'Fitness and exercise solutions', 'health', 'Dumbbell', health_id),
    ('Nutrition', 'nutrition', 'Nutrition and diet innovations', 'health', 'Apple', health_id),
    ('Medical Devices', 'medical-devices', 'Medical device innovations', 'health', 'Stethoscope', health_id),
    ('Telehealth', 'telehealth', 'Remote healthcare solutions', 'health', 'Video', health_id);

    -- Insert subcategories for Entertainment
    INSERT INTO categories (name, slug, description, type, icon, parent_id) VALUES
    ('Streaming', 'streaming', 'Streaming service innovations', 'entertainment', 'Play', entertainment_id),
    ('Virtual Reality', 'vr', 'VR and AR entertainment', 'entertainment', 'Glasses', entertainment_id),
    ('Live Events', 'live-events', 'Live entertainment solutions', 'entertainment', 'Ticket', entertainment_id),
    ('Gaming', 'gaming', 'Gaming platforms and services', 'entertainment', 'Gamepad', entertainment_id),
    ('Social Entertainment', 'social-entertainment', 'Social entertainment apps', 'entertainment', 'Users', entertainment_id),
    ('Sports', 'sports', 'Sports and recreation', 'entertainment', 'Trophy', entertainment_id);

    -- Insert subcategories for Environment
    INSERT INTO categories (name, slug, description, type, icon, parent_id) VALUES
    ('Clean Energy', 'clean-energy', 'Renewable energy solutions', 'other', 'Sun', environment_id),
    ('Recycling', 'recycling', 'Recycling and waste management', 'other', 'Recycle', environment_id),
    ('Conservation', 'conservation', 'Environmental conservation', 'other', 'Leaf', environment_id),
    ('Sustainable Transport', 'sustainable-transport', 'Green transportation', 'other', 'Car', environment_id),
    ('Climate Tech', 'climate-tech', 'Climate change solutions', 'other', 'Cloud', environment_id),
    ('Green Building', 'green-building', 'Sustainable architecture', 'other', 'Home', environment_id);
END $$;

-- Create a function to map old categories to new ones
CREATE OR REPLACE FUNCTION map_old_category_to_new(old_category TEXT)
RETURNS UUID AS $$
DECLARE
  mapped_id UUID;
BEGIN
  -- First try exact match with slug
  SELECT id INTO mapped_id
  FROM categories
  WHERE slug = LOWER(REGEXP_REPLACE(old_category, '\s+', '-', 'g'));

  -- If no match, try to map based on keywords
  IF mapped_id IS NULL THEN
    SELECT id INTO mapped_id
    FROM categories
    WHERE 
      CASE 
        WHEN old_category ILIKE '%tech%' OR old_category ILIKE '%software%' OR old_category ILIKE '%app%' THEN slug = 'technology'
        WHEN old_category ILIKE '%business%' OR old_category ILIKE '%startup%' OR old_category ILIKE '%enterprise%' THEN slug = 'business'
        WHEN old_category ILIKE '%art%' OR old_category ILIKE '%design%' OR old_category ILIKE '%creative%' THEN slug = 'creative'
        WHEN old_category ILIKE '%social%' OR old_category ILIKE '%impact%' OR old_category ILIKE '%community%' THEN slug = 'social-impact'
        WHEN old_category ILIKE '%education%' OR old_category ILIKE '%learning%' OR old_category ILIKE '%teach%' THEN slug = 'education'
        WHEN old_category ILIKE '%health%' OR old_category ILIKE '%medical%' OR old_category ILIKE '%wellness%' THEN slug = 'healthcare'
        ELSE slug = 'technology' -- Default to technology if no match
      END
    LIMIT 1;
  END IF;

  RETURN mapped_id;
END;
$$ LANGUAGE plpgsql;

-- Migrate existing ideas to new category system
UPDATE ideas
SET category_id = map_old_category_to_new(category)
WHERE category IS NOT NULL;

-- Update idea counts
UPDATE categories c
SET idea_count = (
  SELECT COUNT(*)
  FROM ideas
  WHERE category_id = c.id
);

-- Make category_id required after migration
ALTER TABLE ideas
ALTER COLUMN category_id SET NOT NULL;

-- Create a view for backward compatibility
CREATE OR REPLACE VIEW idea_categories AS
SELECT i.id as idea_id, 
       COALESCE(c.name, 'Unknown') as category_name,
       c.slug as category_slug,
       c.icon as category_icon,
       sc.name as subcategory_name,
       sc.slug as subcategory_slug
FROM ideas i
LEFT JOIN categories c ON i.category_id = c.id
LEFT JOIN categories sc ON i.subcategory_id = sc.id; 
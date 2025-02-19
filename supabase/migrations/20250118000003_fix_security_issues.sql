DROP VIEW IF EXISTS idea_categories;

CREATE VIEW idea_categories AS
SELECT i.id as idea_id, 
       COALESCE(c.name, 'Unknown') as category_name,
       c.slug as category_slug,
       c.icon as category_icon,
       sc.name as subcategory_name,
       sc.slug as subcategory_slug
FROM ideas i
LEFT JOIN categories c ON i.category_id = c.id
LEFT JOIN categories sc ON i.subcategory_id = sc.id;

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
    ON audit_logs FOR SELECT
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view audit logs of their records"
    ON audit_logs FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR 
        record_id IN (
            SELECT id FROM ideas WHERE user_id = auth.uid()
            UNION
            SELECT id FROM comments WHERE user_id = auth.uid()
        )
    );

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at); 
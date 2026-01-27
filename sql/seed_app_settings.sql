-- ============================================
-- Seed data for app_settings table
-- Run this script manually against your PostgreSQL database
-- ============================================

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.app_settings (
    name VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL
);

-- Insert seed data (skip if already exists)
INSERT INTO public.app_settings (name, value) VALUES
    ('app_version', '1.0'),
    ('db_version', '1.0'),
    ('webapp_main_color', 'blue'),
    ('index_page', '<h1>Welcome to SalesQuoteMgr</h1>'),
    ('client_name', 'WAB Group USA')
ON CONFLICT (name) DO NOTHING;

-- Verify the data was inserted
SELECT * FROM public.app_settings;

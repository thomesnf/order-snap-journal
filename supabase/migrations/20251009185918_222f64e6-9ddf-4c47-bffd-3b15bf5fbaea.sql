-- Add PDF layout settings to the settings table
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS pdf_primary_color text DEFAULT '#2563eb',
ADD COLUMN IF NOT EXISTS pdf_font_family text DEFAULT 'Arial, sans-serif',
ADD COLUMN IF NOT EXISTS pdf_show_logo boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS pdf_logo_max_height integer DEFAULT 80,
ADD COLUMN IF NOT EXISTS pdf_page_margin integer DEFAULT 20;
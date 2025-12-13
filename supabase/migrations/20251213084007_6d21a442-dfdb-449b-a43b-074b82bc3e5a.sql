-- Add default_summary_entries column to order_templates
ALTER TABLE public.order_templates
ADD COLUMN default_summary_entries jsonb DEFAULT '[]'::jsonb;
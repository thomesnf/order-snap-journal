-- Add app_logo_url column to settings table for separate app and PDF logos
ALTER TABLE public.settings 
ADD COLUMN app_logo_url TEXT;
-- Add date_format column to settings table
ALTER TABLE public.settings 
ADD COLUMN date_format TEXT DEFAULT 'MM/DD/YYYY' CHECK (date_format IN ('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD.MM.YYYY'));
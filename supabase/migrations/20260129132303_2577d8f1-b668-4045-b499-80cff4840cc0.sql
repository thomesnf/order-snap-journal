-- Add PDF photo and layout settings columns
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS pdf_photo_scale integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS pdf_photo_columns integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS pdf_order_details_columns integer DEFAULT 2;
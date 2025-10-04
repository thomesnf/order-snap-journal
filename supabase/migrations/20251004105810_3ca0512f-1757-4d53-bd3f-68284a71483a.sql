-- Update orders RLS policies to allow all users to view orders
DROP POLICY IF EXISTS "Users can view own orders, admins view all" ON public.orders;

CREATE POLICY "All users can view orders" 
ON public.orders 
FOR SELECT 
USING (deleted_at IS NULL);

-- Only admins can create orders
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;

CREATE POLICY "Only admins can create orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update orders
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;

CREATE POLICY "Only admins can update orders" 
ON public.orders 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) AND deleted_at IS NULL);

-- Create settings table for company logo
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_logo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view settings
CREATE POLICY "Anyone can view settings" 
ON public.settings 
FOR SELECT 
USING (true);

-- Only admins can update settings
CREATE POLICY "Only admins can update settings" 
ON public.settings 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert settings
CREATE POLICY "Only admins can insert settings" 
ON public.settings 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings row
INSERT INTO public.settings (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Create trigger for settings updated_at
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create storage bucket for company logo
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT DO NOTHING;

-- Storage policies for company assets
CREATE POLICY "Public access to company assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'company-assets');

CREATE POLICY "Admins can upload company assets"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'company-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update company assets"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'company-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete company assets"
ON storage.objects
FOR DELETE
USING (bucket_id = 'company-assets' AND has_role(auth.uid(), 'admin'::app_role));
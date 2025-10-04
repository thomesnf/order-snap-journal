-- Add explicit RLS policies for storage buckets to enhance security

-- Policies for company-assets bucket (public bucket for company branding)
CREATE POLICY "Only admins can upload company assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-assets' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Only admins can update company assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-assets' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Only admins can delete company assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-assets' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Anyone can view company assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'company-assets');

-- Policies for order-basis bucket (private bucket for order documents)
CREATE POLICY "Authenticated users can upload order documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'order-basis' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view order documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'order-basis' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update order documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'order-basis' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete order documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'order-basis' 
  AND auth.uid() IS NOT NULL
);
-- Add file validation for storage buckets

-- Create function to validate file uploads
CREATE OR REPLACE FUNCTION public.validate_storage_file()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  max_size_bytes BIGINT;
  file_extension TEXT;
  content_type TEXT;
BEGIN
  -- Get file extension and content type
  file_extension := lower(substring(NEW.name from '\.([^.]*)$'));
  content_type := lower(COALESCE(NEW.metadata->>'mimetype', ''));

  -- Validate based on bucket
  IF NEW.bucket_id = 'company-assets' THEN
    -- Company assets: only images, max 10MB
    max_size_bytes := 10 * 1024 * 1024;
    
    IF NEW.metadata->>'size' IS NOT NULL AND 
       (NEW.metadata->>'size')::BIGINT > max_size_bytes THEN
      RAISE EXCEPTION 'File size exceeds 10MB limit';
    END IF;
    
    IF file_extension NOT IN ('jpg', 'jpeg', 'png', 'webp', 'gif', 'svg') THEN
      RAISE EXCEPTION 'Only image files are allowed (jpg, jpeg, png, webp, gif, svg)';
    END IF;
    
    IF content_type NOT LIKE 'image/%' AND content_type != '' THEN
      RAISE EXCEPTION 'Invalid content type. Only images are allowed';
    END IF;
    
  ELSIF NEW.bucket_id = 'order-basis' THEN
    -- Order basis files: documents and images, max 10MB
    max_size_bytes := 10 * 1024 * 1024;
    
    IF NEW.metadata->>'size' IS NOT NULL AND 
       (NEW.metadata->>'size')::BIGINT > max_size_bytes THEN
      RAISE EXCEPTION 'File size exceeds 10MB limit';
    END IF;
    
    IF file_extension NOT IN ('pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'webp', 'gif') THEN
      RAISE EXCEPTION 'File type not allowed. Allowed: pdf, doc, docx, xls, xlsx, jpg, jpeg, png, webp, gif';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Add trigger to validate uploads on both buckets
DROP TRIGGER IF EXISTS validate_company_assets_upload ON storage.objects;
CREATE TRIGGER validate_company_assets_upload
  BEFORE INSERT ON storage.objects
  FOR EACH ROW
  WHEN (NEW.bucket_id IN ('company-assets', 'order-basis'))
  EXECUTE FUNCTION public.validate_storage_file();

-- Update storage policies to be more restrictive for company-assets
DROP POLICY IF EXISTS "Authenticated users can upload company assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload company assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-assets' AND 
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Authenticated users can update company assets" ON storage.objects;
CREATE POLICY "Authenticated users can update company assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'company-assets' AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id = 'company-assets' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete company assets" ON storage.objects;
CREATE POLICY "Authenticated users can delete company assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'company-assets' AND auth.uid() IS NOT NULL);
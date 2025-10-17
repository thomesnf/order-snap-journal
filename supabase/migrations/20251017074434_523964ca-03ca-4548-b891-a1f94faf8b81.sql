-- Drop all triggers first, then the function with CASCADE
DROP TRIGGER IF EXISTS validate_storage_file_trigger ON storage.objects;
DROP TRIGGER IF EXISTS validate_company_assets_upload ON storage.objects;
DROP FUNCTION IF EXISTS public.validate_storage_file() CASCADE;

-- Recreate the validation function with .sor support
CREATE OR REPLACE FUNCTION public.validate_storage_file()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'storage'
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
    -- Order basis files: documents, images, and .sor files, max 10MB
    max_size_bytes := 10 * 1024 * 1024;
    
    IF NEW.metadata->>'size' IS NOT NULL AND 
       (NEW.metadata->>'size')::BIGINT > max_size_bytes THEN
      RAISE EXCEPTION 'File size exceeds 10MB limit';
    END IF;
    
    -- Allow more file types including .sor
    IF file_extension NOT IN ('pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'sor') THEN
      RAISE EXCEPTION 'File type not allowed. Allowed: pdf, doc, docx, xls, xlsx, jpg, jpeg, png, webp, gif, sor';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate both triggers
CREATE TRIGGER validate_storage_file_trigger
  BEFORE INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_storage_file();

CREATE TRIGGER validate_company_assets_upload
  BEFORE INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_storage_file();
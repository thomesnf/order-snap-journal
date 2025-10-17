-- Simplify validation to allow .sor files by extension, regardless of MIME type
DROP FUNCTION IF EXISTS public.validate_storage_file() CASCADE;

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
    
    -- Check file extension first
    IF file_extension NOT IN ('pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'sor') THEN
      RAISE EXCEPTION 'File type not allowed. Allowed: pdf, doc, docx, xls, xlsx, jpg, jpeg, png, webp, gif, sor';
    END IF;
    
    -- For .sor files, skip MIME type validation entirely
    IF file_extension = 'sor' THEN
      RETURN NEW;
    END IF;
    
    -- For other file types, validate MIME type if provided
    IF content_type != '' THEN
      IF content_type NOT IN (
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif'
      ) AND content_type NOT LIKE 'image/%' THEN
        RAISE EXCEPTION 'mime type % is not supported', content_type;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER validate_storage_upload
  BEFORE INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_storage_file();

CREATE TRIGGER validate_storage_update
  BEFORE UPDATE ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_storage_file();
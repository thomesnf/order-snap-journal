-- Fix .sor file validation by completely removing MIME type check for .sor files
-- The issue is the validation happens BEFORE the function checks extension
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
    
    -- Check size limit
    IF NEW.metadata->>'size' IS NOT NULL AND 
       (NEW.metadata->>'size')::BIGINT > max_size_bytes THEN
      RAISE EXCEPTION 'File size exceeds 10MB limit';
    END IF;
    
    -- Validate file extension
    IF file_extension NOT IN ('pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'sor') THEN
      RAISE EXCEPTION 'File type not allowed. Allowed: pdf, doc, docx, xls, xlsx, jpg, jpeg, png, webp, gif, sor';
    END IF;
    
    -- CRITICAL: For .sor files, accept ANY MIME type (including application/octet-stream)
    -- Return immediately without MIME validation
    IF file_extension = 'sor' THEN
      RETURN NEW;
    END IF;
    
    -- For non-.sor files, validate MIME type only if it's provided
    IF content_type != '' THEN
      -- Allow images with any image/* MIME type
      IF content_type LIKE 'image/%' THEN
        RETURN NEW;
      END IF;
      
      -- Validate specific document MIME types
      IF content_type NOT IN (
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ) THEN
        RAISE EXCEPTION 'MIME type % is not supported for file extension %', content_type, file_extension;
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

-- Update journal_entries delete policy to allow admins to delete any entry
DROP POLICY IF EXISTS "Users can delete their own journal entries" ON public.journal_entries;

CREATE POLICY "Users can delete their own journal entries or admins can delete any"
ON public.journal_entries
FOR DELETE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

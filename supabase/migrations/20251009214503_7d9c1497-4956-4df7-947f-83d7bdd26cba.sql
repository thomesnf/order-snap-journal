-- Add RLS policies for order-basis storage bucket
-- Users can view files from their assigned orders
CREATE POLICY "Users can view files from assigned orders"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'order-basis' AND
  (
    -- Admins can see all files
    public.has_role(auth.uid(), 'admin'::app_role) OR
    -- Users can see files from orders they created
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id::text = (storage.foldername(name))[1]
      AND o.user_id = auth.uid()
      AND o.deleted_at IS NULL
    ) OR
    -- Users can see files from orders they're assigned to
    EXISTS (
      SELECT 1 FROM public.order_assignments oa
      JOIN public.orders o ON oa.order_id = o.id
      WHERE o.id::text = (storage.foldername(name))[1]
      AND oa.user_id = auth.uid()
      AND o.deleted_at IS NULL
    )
  )
);

-- Users can upload files to their assigned orders
CREATE POLICY "Users can upload files to assigned orders"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'order-basis' AND
  (
    -- Admins can upload to any order
    public.has_role(auth.uid(), 'admin'::app_role) OR
    -- Users can upload to orders they created
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id::text = (storage.foldername(name))[1]
      AND o.user_id = auth.uid()
      AND o.deleted_at IS NULL
    ) OR
    -- Users can upload to orders they're assigned to
    EXISTS (
      SELECT 1 FROM public.order_assignments oa
      JOIN public.orders o ON oa.order_id = o.id
      WHERE o.id::text = (storage.foldername(name))[1]
      AND oa.user_id = auth.uid()
      AND o.deleted_at IS NULL
    )
  )
);

-- Users can update files they uploaded
CREATE POLICY "Users can update their own files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'order-basis' AND
  owner = auth.uid()
);

-- Users can delete files they uploaded or admins can delete any
CREATE POLICY "Users can delete their own files or admins can delete any"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'order-basis' AND
  (
    owner = auth.uid() OR
    public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Prevent deletion of last admin role
CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count integer;
BEGIN
  -- Only check for admin role deletions
  IF OLD.role = 'admin' THEN
    -- Count remaining admins after this deletion
    SELECT COUNT(*) INTO admin_count
    FROM public.user_roles
    WHERE role = 'admin'
    AND user_id != OLD.user_id;
    
    -- Prevent deletion if this is the last admin
    IF admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last admin user from the system';
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Add trigger for last admin protection
DROP TRIGGER IF EXISTS enforce_last_admin_protection ON public.user_roles;
CREATE TRIGGER enforce_last_admin_protection
BEFORE DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_last_admin_removal();

COMMENT ON FUNCTION public.prevent_last_admin_removal() IS 'Prevents deletion of the last admin role to ensure system always has at least one admin';
-- Create function to prevent root@localhost user deletion or admin role removal
CREATE OR REPLACE FUNCTION public.protect_root_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  root_email text;
BEGIN
  -- Check if the user being affected is root@localhost
  IF TG_TABLE_NAME = 'user_roles' THEN
    -- Get the email of the user whose role is being deleted
    SELECT email INTO root_email
    FROM auth.users
    WHERE id = OLD.user_id;
    
    -- Prevent removal of admin role from root@localhost
    IF root_email = 'root@localhost' AND OLD.role = 'admin' THEN
      RAISE EXCEPTION 'Cannot remove admin role from root@localhost user';
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Add trigger to user_roles table to prevent admin role removal from root@localhost
DROP TRIGGER IF EXISTS prevent_root_admin_removal ON public.user_roles;
CREATE TRIGGER prevent_root_admin_removal
BEFORE DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.protect_root_admin();

-- Add comment for documentation
COMMENT ON FUNCTION public.protect_root_admin() IS 'Prevents deletion or admin role removal from root@localhost user';
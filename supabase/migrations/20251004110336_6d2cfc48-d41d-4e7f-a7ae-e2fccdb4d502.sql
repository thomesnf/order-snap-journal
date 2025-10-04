-- Fix user_roles table security
-- Users should only see their own role, admins can see all roles
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;

CREATE POLICY "Users can view own role, admins view all" 
ON public.user_roles 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'admin'::app_role)
);
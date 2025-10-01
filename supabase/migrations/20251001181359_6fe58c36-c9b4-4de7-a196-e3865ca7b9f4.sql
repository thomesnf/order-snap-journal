-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a new restrictive policy that allows:
-- 1. Users to view their own profile
-- 2. Admins to view all profiles (needed for user management)
CREATE POLICY "Users can view own profile, admins view all"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id OR public.has_role(auth.uid(), 'admin'::app_role)
);
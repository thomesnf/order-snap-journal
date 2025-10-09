-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view own profile or admins view all" ON public.profiles;

-- Create two separate policies for better security

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy 2: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
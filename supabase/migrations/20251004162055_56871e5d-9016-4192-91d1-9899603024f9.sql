-- Drop the conflicting SELECT policies on profiles table
DROP POLICY IF EXISTS "Authenticated users can view own profile, admins view all" ON public.profiles;
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;

-- Create a single consolidated SELECT policy that:
-- 1. Requires authentication (blocks anonymous users)
-- 2. Allows users to view their own profile
-- 3. Allows admins to view all profiles
CREATE POLICY "Authenticated users can view own profile or admins view all"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (auth.uid() = id OR has_role(auth.uid(), 'admin'))
);
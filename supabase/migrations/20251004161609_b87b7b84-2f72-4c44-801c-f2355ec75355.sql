-- Add stricter RLS policy to profiles table to prevent anonymous access
-- This ensures only authenticated users can view their own profile or admins can view all

-- Drop the existing policy that only checks authentication after the query
DROP POLICY IF EXISTS "Users can view own profile, admins view all" ON public.profiles;

-- Create a new policy that blocks anonymous access completely
CREATE POLICY "Authenticated users can view own profile, admins view all"
ON public.profiles
FOR SELECT
TO authenticated
USING ((auth.uid() = id) OR has_role(auth.uid(), 'admin'));

-- Add policy to block all public/anonymous access explicitly
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);
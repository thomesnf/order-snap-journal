-- Fix settings table RLS policy to require authentication
DROP POLICY IF EXISTS "Anyone can view settings" ON public.settings;

CREATE POLICY "Authenticated users can view settings"
ON public.settings
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);
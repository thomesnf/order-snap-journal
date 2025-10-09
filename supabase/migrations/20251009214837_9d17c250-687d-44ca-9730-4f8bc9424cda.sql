-- Add explicit RLS policy to deny unauthenticated access to customers table
CREATE POLICY "Deny unauthenticated access to customers"
ON public.customers
FOR SELECT
TO anon
USING (false);
-- Drop the problematic deny-all policy that conflicts with admin access
DROP POLICY IF EXISTS "Deny unauthenticated access to customers" ON public.customers;

-- The existing "Only admins can view customers" policy is sufficient
-- It already restricts SELECT access to only users with the admin role
-- No additional restrictive policies are needed
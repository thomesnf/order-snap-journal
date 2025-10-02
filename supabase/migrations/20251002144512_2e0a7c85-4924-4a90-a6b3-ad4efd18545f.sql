-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view non-deleted orders" ON public.orders;

-- Create a new, properly restricted SELECT policy
-- Users can only view their own orders, admins can view all orders
CREATE POLICY "Users can view own orders, admins view all"
ON public.orders
FOR SELECT
USING (
  (auth.uid() = user_id AND deleted_at IS NULL) 
  OR 
  (public.has_role(auth.uid(), 'admin'::app_role) AND deleted_at IS NULL)
);
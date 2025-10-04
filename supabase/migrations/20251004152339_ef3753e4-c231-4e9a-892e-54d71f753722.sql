-- Fix critical security issue: Restrict orders SELECT policy to prevent customer data exposure
-- Users should only be able to view orders they created/are assigned to, or if they are admins

DROP POLICY IF EXISTS "Authenticated users can view orders" ON public.orders;

CREATE POLICY "Users can view their assigned orders or admins can view all"
ON public.orders
FOR SELECT
TO authenticated
USING (
  (deleted_at IS NULL) 
  AND 
  (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
);
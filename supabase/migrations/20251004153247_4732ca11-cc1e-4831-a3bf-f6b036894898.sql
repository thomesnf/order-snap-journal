-- Fix infinite recursion in RLS policies by breaking circular dependency

-- Drop the problematic policy on order_assignments
DROP POLICY IF EXISTS "Users can view assignments for orders they can see" ON public.order_assignments;

-- Create a simpler policy that doesn't reference orders table
-- Users can see assignments if they are assigned OR if they are admin
CREATE POLICY "Users can view their own assignments or admins view all"
ON public.order_assignments
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- The orders policy remains the same - it can reference order_assignments without recursion
-- because order_assignments no longer references orders
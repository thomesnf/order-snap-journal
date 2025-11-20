-- Create a security definer function to check if a user has time entries for an order
-- This bypasses RLS to avoid circular dependencies
CREATE OR REPLACE FUNCTION public.user_has_time_entries_for_order(_user_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.time_entries
    WHERE order_id = _order_id
      AND technician_id = _user_id
  )
$$;

-- Update orders RLS policy to use the security definer function
DROP POLICY IF EXISTS "Users can view assigned orders or admins can view all" ON orders;

CREATE POLICY "Users can view assigned orders or admins can view all"
ON orders
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL 
  AND (
    auth.uid() = user_id 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM order_assignments
      WHERE order_assignments.order_id = orders.id 
        AND order_assignments.user_id = auth.uid()
    )
    OR user_has_time_entries_for_order(auth.uid(), orders.id)
  )
);
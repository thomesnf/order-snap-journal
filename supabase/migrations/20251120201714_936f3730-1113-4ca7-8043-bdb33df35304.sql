-- Update orders RLS policy to allow users to view orders where they have logged time entries
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
    OR EXISTS (
      SELECT 1
      FROM time_entries
      WHERE time_entries.order_id = orders.id 
        AND time_entries.technician_id = auth.uid()
    )
  )
);
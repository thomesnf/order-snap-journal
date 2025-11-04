-- Drop the current policy
DROP POLICY IF EXISTS "Users can create time entries for their orders" ON public.time_entries;

-- Create a new policy that allows admins to add time entries with any user_id
CREATE POLICY "Users can create time entries for their orders"
ON public.time_entries
FOR INSERT
WITH CHECK (
  -- Admins can add time entries with any user_id to any non-deleted order
  (
    has_role(auth.uid(), 'admin') 
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = time_entries.order_id
      AND orders.deleted_at IS NULL
    )
  )
  OR
  -- Non-admins can only add their own time entries to orders they own or are assigned to
  (
    (auth.uid() = user_id) 
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = time_entries.order_id
      AND orders.deleted_at IS NULL
      AND (
        orders.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.order_assignments
          WHERE order_assignments.order_id = orders.id
          AND order_assignments.user_id = auth.uid()
        )
      )
    )
  )
);
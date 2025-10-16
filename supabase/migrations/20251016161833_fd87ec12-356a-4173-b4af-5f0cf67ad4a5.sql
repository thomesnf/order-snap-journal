-- Allow assigned users to create journal entries on their assigned orders
DROP POLICY IF EXISTS "Users can create journal entries" ON public.journal_entries;

CREATE POLICY "Users can create journal entries"
ON public.journal_entries
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = journal_entries.order_id
    AND orders.deleted_at IS NULL
    AND (
      orders.user_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM order_assignments
        WHERE order_assignments.order_id = orders.id
        AND order_assignments.user_id = auth.uid()
      )
    )
  )
);

-- Allow assigned users to update their own journal entries on assigned orders
DROP POLICY IF EXISTS "Users can update their own journal entries or admins can update" ON public.journal_entries;

CREATE POLICY "Users can update their own journal entries or admins can update"
ON public.journal_entries
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

-- Allow assigned users to create summary entries on their assigned orders
DROP POLICY IF EXISTS "Users can create summary entries" ON public.summary_entries;

CREATE POLICY "Users can create summary entries"
ON public.summary_entries
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = summary_entries.order_id
    AND orders.deleted_at IS NULL
    AND (
      orders.user_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM order_assignments
        WHERE order_assignments.order_id = orders.id
        AND order_assignments.user_id = auth.uid()
      )
    )
  )
);

-- Allow assigned users to view summary entries on their assigned orders
DROP POLICY IF EXISTS "Users can view summary entries of visible orders" ON public.summary_entries;

CREATE POLICY "Users can view summary entries of visible orders"
ON public.summary_entries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = summary_entries.order_id
    AND orders.deleted_at IS NULL
    AND (
      orders.user_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM order_assignments
        WHERE order_assignments.order_id = orders.id
        AND order_assignments.user_id = auth.uid()
      )
    )
  )
);
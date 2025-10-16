-- Allow assigned users to view journal entries on their assigned orders
DROP POLICY IF EXISTS "Users can view journal entries of visible orders" ON public.journal_entries;

CREATE POLICY "Users can view journal entries of visible orders"
ON public.journal_entries
FOR SELECT
USING (
  EXISTS (
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

-- Allow assigned users to view photos on their assigned orders
DROP POLICY IF EXISTS "Users can view photos of visible orders" ON public.photos;

CREATE POLICY "Users can view photos of visible orders"
ON public.photos
FOR SELECT
USING (
  (
    order_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = photos.order_id
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
  )
  OR (
    journal_entry_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM journal_entries je
      JOIN orders o ON je.order_id = o.id
      WHERE je.id = photos.journal_entry_id
      AND o.deleted_at IS NULL
      AND (
        o.user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR EXISTS (
          SELECT 1 FROM order_assignments
          WHERE order_assignments.order_id = o.id
          AND order_assignments.user_id = auth.uid()
        )
      )
    )
  )
);

-- Allow assigned users to view time entries on their assigned orders
DROP POLICY IF EXISTS "Users can view time entries for their orders" ON public.time_entries;

CREATE POLICY "Users can view time entries for their orders"
ON public.time_entries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = time_entries.order_id
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
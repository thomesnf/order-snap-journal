-- Allow assigned users to add time entries to their assigned orders
DROP POLICY IF EXISTS "Users can create time entries for their orders" ON public.time_entries;

CREATE POLICY "Users can create time entries for their orders"
ON public.time_entries
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
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

-- Allow assigned users to add photos to their assigned orders
DROP POLICY IF EXISTS "Users can create photos" ON public.photos;

CREATE POLICY "Users can create photos"
ON public.photos
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND (
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
  )
);
-- Fix RLS policy for admins to delete time entries
DROP POLICY IF EXISTS "Users can delete their own time entries" ON public.time_entries;

CREATE POLICY "Users can delete their own time entries or admins can delete any"
ON public.time_entries
FOR DELETE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Fix RLS policy for admins to update orders (add WITH CHECK clause)
DROP POLICY IF EXISTS "Only admins can update orders" ON public.orders;

CREATE POLICY "Only admins can update orders"
ON public.orders
FOR UPDATE
USING (has_role(auth.uid(), 'admin') AND deleted_at IS NULL)
WITH CHECK (has_role(auth.uid(), 'admin') AND deleted_at IS NULL);
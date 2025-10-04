-- Fix public exposure of orders table by requiring authentication
DROP POLICY IF EXISTS "All users can view orders" ON public.orders;

CREATE POLICY "Authenticated users can view orders"
ON public.orders
FOR SELECT
USING ((deleted_at IS NULL) AND (auth.uid() IS NOT NULL));
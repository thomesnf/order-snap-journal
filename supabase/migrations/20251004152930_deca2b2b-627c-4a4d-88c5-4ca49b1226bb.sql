-- Create order_assignments junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.order_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  UNIQUE(order_id, user_id)
);

-- Enable RLS on order_assignments
ALTER TABLE public.order_assignments ENABLE ROW LEVEL SECURITY;

-- Migrate existing data: copy current user_id assignments to the junction table
INSERT INTO public.order_assignments (order_id, user_id, assigned_by)
SELECT id, user_id, user_id
FROM public.orders
WHERE user_id IS NOT NULL
ON CONFLICT (order_id, user_id) DO NOTHING;

-- RLS Policies for order_assignments
CREATE POLICY "Users can view assignments for orders they can see"
ON public.order_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_assignments.order_id
    AND orders.deleted_at IS NULL
    AND (orders.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Admins can create order assignments"
ON public.order_assignments
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete order assignments"
ON public.order_assignments
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update orders SELECT policy to check assignments
DROP POLICY IF EXISTS "Users can view their assigned orders or admins can view all" ON public.orders;

CREATE POLICY "Users can view assigned orders or admins can view all"
ON public.orders
FOR SELECT
TO authenticated
USING (
  (deleted_at IS NULL) 
  AND 
  (
    auth.uid() = user_id 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.order_assignments
      WHERE order_assignments.order_id = orders.id
      AND order_assignments.user_id = auth.uid()
    )
  )
);

-- Create index for better performance on lookups
CREATE INDEX IF NOT EXISTS idx_order_assignments_order_id ON public.order_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_assignments_user_id ON public.order_assignments(user_id);
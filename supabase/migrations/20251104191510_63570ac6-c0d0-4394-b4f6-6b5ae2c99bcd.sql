-- Create stages table for order workflow steps
CREATE TABLE public.order_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  order_position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.order_stages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for order_stages
CREATE POLICY "Users can view stages for their orders"
ON public.order_stages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_stages.order_id
    AND orders.deleted_at IS NULL
    AND (
      orders.user_id = auth.uid()
      OR has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.order_assignments
        WHERE order_assignments.order_id = orders.id
        AND order_assignments.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Admins can create stages"
ON public.order_stages
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_stages.order_id
    AND orders.deleted_at IS NULL
  )
);

CREATE POLICY "Admins can update stages"
ON public.order_stages
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete stages"
ON public.order_stages
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Add stage_id to time_entries
ALTER TABLE public.time_entries
ADD COLUMN stage_id UUID REFERENCES public.order_stages(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_order_stages_order_id ON public.order_stages(order_id);
CREATE INDEX idx_time_entries_stage_id ON public.time_entries(stage_id);

-- Trigger for updated_at
CREATE TRIGGER update_order_stages_updated_at
BEFORE UPDATE ON public.order_stages
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
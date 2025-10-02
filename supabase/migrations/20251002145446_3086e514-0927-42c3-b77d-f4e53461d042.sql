-- Create table for tracking technician work hours
CREATE TABLE public.time_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL,
  user_id uuid NOT NULL,
  technician_name text NOT NULL,
  work_date date NOT NULL,
  hours_worked numeric(4,2) NOT NULL CHECK (hours_worked > 0 AND hours_worked <= 24),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for time entries
CREATE POLICY "Users can create time entries for their orders"
ON public.time_entries
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = time_entries.order_id
    AND orders.deleted_at IS NULL
    AND (orders.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Users can view time entries for their orders"
ON public.time_entries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = time_entries.order_id
    AND orders.deleted_at IS NULL
    AND (orders.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Users can update their own time entries"
ON public.time_entries
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time entries"
ON public.time_entries
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_time_entries_updated_at
BEFORE UPDATE ON public.time_entries
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
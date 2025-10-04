-- Create summary_entries table
CREATE TABLE public.summary_entries (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  order_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.summary_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for summary_entries
CREATE POLICY "Users can view summary entries of visible orders" 
ON public.summary_entries 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM orders 
  WHERE orders.id = summary_entries.order_id 
  AND orders.deleted_at IS NULL
));

CREATE POLICY "Users can create summary entries" 
ON public.summary_entries 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = summary_entries.order_id 
    AND orders.deleted_at IS NULL
  )
);

CREATE POLICY "Users can update their own summary entries" 
ON public.summary_entries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own summary entries" 
ON public.summary_entries 
FOR DELETE 
USING (auth.uid() = user_id);
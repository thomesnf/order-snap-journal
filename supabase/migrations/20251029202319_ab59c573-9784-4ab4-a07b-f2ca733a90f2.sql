-- Add missing foreign key constraint for summary_entries
ALTER TABLE public.summary_entries
ADD CONSTRAINT summary_entries_order_id_fkey 
FOREIGN KEY (order_id) 
REFERENCES public.orders(id) 
ON DELETE CASCADE;
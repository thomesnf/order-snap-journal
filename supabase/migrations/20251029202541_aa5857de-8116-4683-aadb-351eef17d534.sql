-- First, delete orphaned time_entries that reference non-existent orders
DELETE FROM public.time_entries
WHERE order_id NOT IN (SELECT id FROM public.orders);

-- Then add the foreign key constraint
ALTER TABLE public.time_entries
ADD CONSTRAINT time_entries_order_id_fkey 
FOREIGN KEY (order_id) 
REFERENCES public.orders(id) 
ON DELETE CASCADE;
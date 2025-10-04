-- Add summary column to orders table
ALTER TABLE public.orders
ADD COLUMN summary TEXT;
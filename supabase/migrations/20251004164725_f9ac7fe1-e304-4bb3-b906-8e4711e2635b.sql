-- Step 1: Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 2: Add customer_id column to orders FIRST (before migration)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- Step 3: Enable RLS on customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies - admin-only access
CREATE POLICY "Only admins can view customers"
ON public.customers
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete customers"
ON public.customers
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Step 5: Migrate existing customer data
DO $$
DECLARE
  order_record RECORD;
  new_customer_id UUID;
  existing_customer_id UUID;
BEGIN
  FOR order_record IN 
    SELECT DISTINCT customer, customer_ref 
    FROM public.orders 
    WHERE customer IS NOT NULL OR customer_ref IS NOT NULL
  LOOP
    -- Check if customer already exists
    SELECT id INTO existing_customer_id
    FROM public.customers
    WHERE customer_name = order_record.customer 
      AND customer_ref IS NOT DISTINCT FROM order_record.customer_ref
    LIMIT 1;
    
    IF existing_customer_id IS NULL THEN
      -- Create new customer
      INSERT INTO public.customers (customer_name, customer_ref)
      VALUES (
        COALESCE(order_record.customer, 'Unknown'),
        order_record.customer_ref
      )
      RETURNING id INTO new_customer_id;
      
      existing_customer_id := new_customer_id;
    END IF;
    
    -- Link orders to customer
    UPDATE public.orders
    SET customer_id = existing_customer_id
    WHERE (customer = order_record.customer OR (customer IS NULL AND order_record.customer IS NULL))
      AND (customer_ref = order_record.customer_ref OR (customer_ref IS NULL AND order_record.customer_ref IS NULL));
  END LOOP;
END $$;

-- Step 6: Create index and trigger
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);

CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Step 7: Add comments
COMMENT ON TABLE public.customers IS 'Customer information - admin access only for security';
COMMENT ON COLUMN public.orders.customer_id IS 'Reference to customer (admin-only access for full details)';
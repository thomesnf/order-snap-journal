-- Add technician_id column to time_entries to properly track who the hours belong to
ALTER TABLE public.time_entries 
ADD COLUMN technician_id uuid REFERENCES public.profiles(id);

-- Update existing records to set technician_id based on user_id for now
UPDATE public.time_entries 
SET technician_id = user_id 
WHERE technician_id IS NULL;

-- Make technician_id not null after populating existing data
ALTER TABLE public.time_entries 
ALTER COLUMN technician_id SET NOT NULL;

-- Update RLS policy so users can only see their own hours
DROP POLICY IF EXISTS "Authenticated users can view all time entries" ON time_entries;

CREATE POLICY "Users can view their own time entries or admins view all"
ON time_entries
FOR SELECT
TO authenticated
USING (
  technician_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
);
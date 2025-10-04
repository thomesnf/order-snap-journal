-- Drop existing policy
DROP POLICY IF EXISTS "Users can update their own journal entries" ON public.journal_entries;

-- Create new policy allowing users to update their own entries OR admins to update any entry
CREATE POLICY "Users can update their own journal entries or admins can update all"
ON public.journal_entries
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
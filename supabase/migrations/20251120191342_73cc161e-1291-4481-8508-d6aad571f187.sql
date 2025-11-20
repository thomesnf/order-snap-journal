-- Drop the existing restrictive policy for viewing time entries
DROP POLICY IF EXISTS "Users can view time entries for their orders" ON time_entries;

-- Create a new policy that allows all authenticated users to view all time entries
CREATE POLICY "Authenticated users can view all time entries"
ON time_entries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM orders
    WHERE orders.id = time_entries.order_id
    AND orders.deleted_at IS NULL
  )
);
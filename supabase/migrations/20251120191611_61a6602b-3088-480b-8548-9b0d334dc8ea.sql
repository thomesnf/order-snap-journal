-- Relax time_entries select policy so any authenticated user can see all time entries
DROP POLICY IF EXISTS "Authenticated users can view all time entries" ON time_entries;

CREATE POLICY "Authenticated users can view all time entries"
ON time_entries
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);
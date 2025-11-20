-- Fix the RLS policy for time_entries to properly separate authenticated and public access
-- The issue is that the public share token policy was also allowing authenticated users to see all hours

DROP POLICY IF EXISTS "Public can view time entries via valid share token" ON time_entries;

-- This policy should ONLY allow unauthenticated users with valid share tokens
CREATE POLICY "Public can view time entries via valid share token"
ON time_entries
FOR SELECT
TO public
USING (
  auth.uid() IS NULL 
  AND EXISTS (
    SELECT 1
    FROM orders
    INNER JOIN share_tokens ON share_tokens.order_id = orders.id
    WHERE orders.id = time_entries.order_id
      AND orders.deleted_at IS NULL
      AND share_tokens.revoked_at IS NULL
      AND share_tokens.expires_at > now()
  )
);
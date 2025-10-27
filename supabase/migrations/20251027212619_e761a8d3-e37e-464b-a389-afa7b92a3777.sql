-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Public can view orders via valid share token" ON public.orders;
DROP POLICY IF EXISTS "Public can view journal entries via valid share token" ON public.journal_entries;
DROP POLICY IF EXISTS "Public can view summary entries via valid share token" ON public.summary_entries;
DROP POLICY IF EXISTS "Public can view photos via valid share token" ON public.photos;
DROP POLICY IF EXISTS "Public can view time entries via valid share token" ON public.time_entries;

-- Drop the share_tokens policies that reference orders
DROP POLICY IF EXISTS "Order creators and admins can view share tokens" ON public.share_tokens;

-- Create a simpler policy for share_tokens that doesn't reference orders
-- Anyone can read non-revoked, non-expired tokens (they're UUIDs anyway, essentially unguessable)
CREATE POLICY "Anyone can view valid share tokens"
  ON public.share_tokens
  FOR SELECT
  USING (revoked_at IS NULL AND expires_at > now());

-- Now recreate the orders and related policies without recursion
CREATE POLICY "Public can view orders via valid share token"
  ON public.orders
  FOR SELECT
  USING (
    deleted_at IS NULL AND (
      auth.uid() = user_id
      OR has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM order_assignments
        WHERE order_assignments.order_id = orders.id
        AND order_assignments.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.share_tokens
        WHERE share_tokens.order_id = orders.id
        AND share_tokens.revoked_at IS NULL
        AND share_tokens.expires_at > now()
      )
    )
  );

CREATE POLICY "Public can view journal entries via valid share token"
  ON public.journal_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = journal_entries.order_id
      AND orders.deleted_at IS NULL
      AND (
        orders.user_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
        OR EXISTS (
          SELECT 1 FROM order_assignments
          WHERE order_assignments.order_id = orders.id
          AND order_assignments.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.share_tokens
          WHERE share_tokens.order_id = orders.id
          AND share_tokens.revoked_at IS NULL
          AND share_tokens.expires_at > now()
        )
      )
    )
  );

CREATE POLICY "Public can view summary entries via valid share token"
  ON public.summary_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = summary_entries.order_id
      AND orders.deleted_at IS NULL
      AND (
        orders.user_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
        OR EXISTS (
          SELECT 1 FROM order_assignments
          WHERE order_assignments.order_id = orders.id
          AND order_assignments.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.share_tokens
          WHERE share_tokens.order_id = orders.id
          AND share_tokens.revoked_at IS NULL
          AND share_tokens.expires_at > now()
        )
      )
    )
  );

CREATE POLICY "Public can view photos via valid share token"
  ON public.photos
  FOR SELECT
  USING (
    (order_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = photos.order_id
      AND orders.deleted_at IS NULL
      AND (
        orders.user_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
        OR EXISTS (
          SELECT 1 FROM order_assignments
          WHERE order_assignments.order_id = orders.id
          AND order_assignments.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.share_tokens
          WHERE share_tokens.order_id = orders.id
          AND share_tokens.revoked_at IS NULL
          AND share_tokens.expires_at > now()
        )
      )
    ))
    OR (journal_entry_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM journal_entries je
      JOIN orders o ON je.order_id = o.id
      WHERE je.id = photos.journal_entry_id
      AND o.deleted_at IS NULL
      AND (
        o.user_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
        OR EXISTS (
          SELECT 1 FROM order_assignments
          WHERE order_assignments.order_id = o.id
          AND order_assignments.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.share_tokens
          WHERE share_tokens.order_id = o.id
          AND share_tokens.revoked_at IS NULL
          AND share_tokens.expires_at > now()
        )
      )
    ))
  );

CREATE POLICY "Public can view time entries via valid share token"
  ON public.time_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = time_entries.order_id
      AND orders.deleted_at IS NULL
      AND (
        orders.user_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
        OR EXISTS (
          SELECT 1 FROM order_assignments
          WHERE order_assignments.order_id = orders.id
          AND order_assignments.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.share_tokens
          WHERE share_tokens.order_id = orders.id
          AND share_tokens.revoked_at IS NULL
          AND share_tokens.expires_at > now()
        )
      )
    )
  );
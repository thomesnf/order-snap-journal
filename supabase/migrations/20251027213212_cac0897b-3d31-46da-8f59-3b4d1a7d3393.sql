-- The issue is that share_tokens policy still requires auth, but public users have no auth
-- We need to make share_tokens fully public for valid tokens

DROP POLICY IF EXISTS "Anyone can view valid share tokens" ON public.share_tokens;

-- Make share_tokens completely public for SELECT (tokens are UUIDs, unguessable)
CREATE POLICY "Public can view all share tokens"
  ON public.share_tokens
  FOR SELECT
  TO public
  USING (true);

-- Now update the orders policy to explicitly allow unauthenticated access via share tokens
DROP POLICY IF EXISTS "Public can view orders via valid share token" ON public.orders;

CREATE POLICY "Public can view orders via valid share token"
  ON public.orders
  FOR SELECT
  TO public
  USING (
    deleted_at IS NULL AND (
      -- Authenticated users with normal access
      (auth.uid() IS NOT NULL AND (
        auth.uid() = user_id
        OR has_role(auth.uid(), 'admin'::app_role)
        OR EXISTS (
          SELECT 1 FROM order_assignments
          WHERE order_assignments.order_id = orders.id
          AND order_assignments.user_id = auth.uid()
        )
      ))
      -- OR anyone (including unauthenticated) with a valid share token
      OR EXISTS (
        SELECT 1 FROM public.share_tokens
        WHERE share_tokens.order_id = orders.id
        AND share_tokens.revoked_at IS NULL
        AND share_tokens.expires_at > now()
      )
    )
  );

-- Update journal entries policy for public access
DROP POLICY IF EXISTS "Public can view journal entries via valid share token" ON public.journal_entries;

CREATE POLICY "Public can view journal entries via valid share token"
  ON public.journal_entries
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = journal_entries.order_id
      AND orders.deleted_at IS NULL
      AND (
        (auth.uid() IS NOT NULL AND (
          orders.user_id = auth.uid()
          OR has_role(auth.uid(), 'admin'::app_role)
          OR EXISTS (
            SELECT 1 FROM order_assignments
            WHERE order_assignments.order_id = orders.id
            AND order_assignments.user_id = auth.uid()
          )
        ))
        OR EXISTS (
          SELECT 1 FROM public.share_tokens
          WHERE share_tokens.order_id = orders.id
          AND share_tokens.revoked_at IS NULL
          AND share_tokens.expires_at > now()
        )
      )
    )
  );

-- Update summary entries policy
DROP POLICY IF EXISTS "Public can view summary entries via valid share token" ON public.summary_entries;

CREATE POLICY "Public can view summary entries via valid share token"
  ON public.summary_entries
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = summary_entries.order_id
      AND orders.deleted_at IS NULL
      AND (
        (auth.uid() IS NOT NULL AND (
          orders.user_id = auth.uid()
          OR has_role(auth.uid(), 'admin'::app_role)
          OR EXISTS (
            SELECT 1 FROM order_assignments
            WHERE order_assignments.order_id = orders.id
            AND order_assignments.user_id = auth.uid()
          )
        ))
        OR EXISTS (
          SELECT 1 FROM public.share_tokens
          WHERE share_tokens.order_id = orders.id
          AND share_tokens.revoked_at IS NULL
          AND share_tokens.expires_at > now()
        )
      )
    )
  );

-- Update photos policy
DROP POLICY IF EXISTS "Public can view photos via valid share token" ON public.photos;

CREATE POLICY "Public can view photos via valid share token"
  ON public.photos
  FOR SELECT
  TO public
  USING (
    (order_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = photos.order_id
      AND orders.deleted_at IS NULL
      AND (
        (auth.uid() IS NOT NULL AND (
          orders.user_id = auth.uid()
          OR has_role(auth.uid(), 'admin'::app_role)
          OR EXISTS (
            SELECT 1 FROM order_assignments
            WHERE order_assignments.order_id = orders.id
            AND order_assignments.user_id = auth.uid()
          )
        ))
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
        (auth.uid() IS NOT NULL AND (
          o.user_id = auth.uid()
          OR has_role(auth.uid(), 'admin'::app_role)
          OR EXISTS (
            SELECT 1 FROM order_assignments
            WHERE order_assignments.order_id = o.id
            AND order_assignments.user_id = auth.uid()
          )
        ))
        OR EXISTS (
          SELECT 1 FROM public.share_tokens
          WHERE share_tokens.order_id = o.id
          AND share_tokens.revoked_at IS NULL
          AND share_tokens.expires_at > now()
        )
      )
    ))
  );

-- Update time entries policy
DROP POLICY IF EXISTS "Public can view time entries via valid share token" ON public.time_entries;

CREATE POLICY "Public can view time entries via valid share token"
  ON public.time_entries
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = time_entries.order_id
      AND orders.deleted_at IS NULL
      AND (
        (auth.uid() IS NOT NULL AND (
          orders.user_id = auth.uid()
          OR has_role(auth.uid(), 'admin'::app_role)
          OR EXISTS (
            SELECT 1 FROM order_assignments
            WHERE order_assignments.order_id = orders.id
            AND order_assignments.user_id = auth.uid()
          )
        ))
        OR EXISTS (
          SELECT 1 FROM public.share_tokens
          WHERE share_tokens.order_id = orders.id
          AND share_tokens.revoked_at IS NULL
          AND share_tokens.expires_at > now()
        )
      )
    )
  );
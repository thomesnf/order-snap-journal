-- Create share_tokens table
CREATE TABLE IF NOT EXISTS public.share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '72 hours'),
  revoked_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.share_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for share_tokens
CREATE POLICY "Order creators and admins can create share tokens"
  ON public.share_tokens
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = share_tokens.order_id
      AND (orders.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Order creators and admins can view share tokens"
  ON public.share_tokens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = share_tokens.order_id
      AND (orders.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Order creators and admins can revoke share tokens"
  ON public.share_tokens
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = share_tokens.order_id
      AND (orders.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- Allow public read access to orders via valid share tokens
CREATE POLICY "Public can view orders via valid share token"
  ON public.orders
  FOR SELECT
  USING (
    deleted_at IS NULL AND (
      EXISTS (
        SELECT 1 FROM public.share_tokens
        WHERE share_tokens.order_id = orders.id
        AND share_tokens.revoked_at IS NULL
        AND share_tokens.expires_at > now()
      )
      OR auth.uid() = user_id
      OR has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM order_assignments
        WHERE order_assignments.order_id = orders.id
        AND order_assignments.user_id = auth.uid()
      )
    )
  );

-- Allow public read access to journal entries via valid share tokens
CREATE POLICY "Public can view journal entries via valid share token"
  ON public.journal_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = journal_entries.order_id
      AND orders.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.share_tokens
          WHERE share_tokens.order_id = orders.id
          AND share_tokens.revoked_at IS NULL
          AND share_tokens.expires_at > now()
        )
        OR orders.user_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
        OR EXISTS (
          SELECT 1 FROM order_assignments
          WHERE order_assignments.order_id = orders.id
          AND order_assignments.user_id = auth.uid()
        )
      )
    )
  );

-- Allow public read access to summary entries via valid share tokens
CREATE POLICY "Public can view summary entries via valid share token"
  ON public.summary_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = summary_entries.order_id
      AND orders.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.share_tokens
          WHERE share_tokens.order_id = orders.id
          AND share_tokens.revoked_at IS NULL
          AND share_tokens.expires_at > now()
        )
        OR orders.user_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
        OR EXISTS (
          SELECT 1 FROM order_assignments
          WHERE order_assignments.order_id = orders.id
          AND order_assignments.user_id = auth.uid()
        )
      )
    )
  );

-- Allow public read access to photos via valid share tokens
CREATE POLICY "Public can view photos via valid share token"
  ON public.photos
  FOR SELECT
  USING (
    (order_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = photos.order_id
      AND orders.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.share_tokens
          WHERE share_tokens.order_id = orders.id
          AND share_tokens.revoked_at IS NULL
          AND share_tokens.expires_at > now()
        )
        OR orders.user_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
        OR EXISTS (
          SELECT 1 FROM order_assignments
          WHERE order_assignments.order_id = orders.id
          AND order_assignments.user_id = auth.uid()
        )
      )
    ))
    OR (journal_entry_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM journal_entries je
      JOIN orders o ON je.order_id = o.id
      WHERE je.id = photos.journal_entry_id
      AND o.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.share_tokens
          WHERE share_tokens.order_id = o.id
          AND share_tokens.revoked_at IS NULL
          AND share_tokens.expires_at > now()
        )
        OR o.user_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
        OR EXISTS (
          SELECT 1 FROM order_assignments
          WHERE order_assignments.order_id = o.id
          AND order_assignments.user_id = auth.uid()
        )
      )
    ))
  );

-- Allow public read access to time entries via valid share tokens
CREATE POLICY "Public can view time entries via valid share token"
  ON public.time_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = time_entries.order_id
      AND orders.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.share_tokens
          WHERE share_tokens.order_id = orders.id
          AND share_tokens.revoked_at IS NULL
          AND share_tokens.expires_at > now()
        )
        OR orders.user_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
        OR EXISTS (
          SELECT 1 FROM order_assignments
          WHERE order_assignments.order_id = orders.id
          AND order_assignments.user_id = auth.uid()
        )
      )
    )
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_share_tokens_token ON public.share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_share_tokens_order_id ON public.share_tokens(order_id);
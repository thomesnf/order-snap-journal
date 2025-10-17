-- Fix storage policies to allow journal photos and order basis files for assigned users
-- Drop the existing upload policy
DROP POLICY IF EXISTS "Users can upload files to assigned orders" ON storage.objects;

-- Create new upload policy that handles both order basis files and journal photos
CREATE POLICY "Users can upload files to assigned orders"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'order-basis' AND (
    -- Admins can upload anything
    has_role(auth.uid(), 'admin') OR
    -- For files in order folder (order-basis files)
    (
      (storage.foldername(name))[1] IN (
        SELECT o.id::text
        FROM orders o
        WHERE o.user_id = auth.uid() AND o.deleted_at IS NULL
      )
      OR
      (storage.foldername(name))[1] IN (
        SELECT o.id::text
        FROM order_assignments oa
        JOIN orders o ON oa.order_id = o.id
        WHERE oa.user_id = auth.uid() AND o.deleted_at IS NULL
      )
    ) OR
    -- For journal photos
    (
      (storage.foldername(name))[1] = 'journal-photos' AND (
        -- Extract journal entry id from filename (format: entryId_timestamp_index.ext)
        split_part((storage.filename(name)), '_', 1) IN (
          SELECT je.id::text
          FROM journal_entries je
          JOIN orders o ON je.order_id = o.id
          WHERE (je.user_id = auth.uid() OR o.user_id = auth.uid() OR has_role(auth.uid(), 'admin')) AND o.deleted_at IS NULL
        )
        OR
        split_part((storage.filename(name)), '_', 1) IN (
          SELECT je.id::text
          FROM journal_entries je
          JOIN orders o ON je.order_id = o.id
          JOIN order_assignments oa ON oa.order_id = o.id
          WHERE oa.user_id = auth.uid() AND o.deleted_at IS NULL
        )
      )
    )
  )
);

-- Update the view policy to handle journal photos as well
DROP POLICY IF EXISTS "Users can view files from assigned orders" ON storage.objects;

CREATE POLICY "Users can view files from assigned orders"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'order-basis' AND (
    -- Admins can view anything
    has_role(auth.uid(), 'admin') OR
    -- For files in order folder
    (
      (storage.foldername(name))[1] IN (
        SELECT o.id::text
        FROM orders o
        WHERE o.user_id = auth.uid() AND o.deleted_at IS NULL
      )
      OR
      (storage.foldername(name))[1] IN (
        SELECT o.id::text
        FROM order_assignments oa
        JOIN orders o ON oa.order_id = o.id
        WHERE oa.user_id = auth.uid() AND o.deleted_at IS NULL
      )
    ) OR
    -- For journal photos
    (
      (storage.foldername(name))[1] = 'journal-photos' AND (
        split_part((storage.filename(name)), '_', 1) IN (
          SELECT je.id::text
          FROM journal_entries je
          JOIN orders o ON je.order_id = o.id
          WHERE (je.user_id = auth.uid() OR o.user_id = auth.uid() OR has_role(auth.uid(), 'admin')) AND o.deleted_at IS NULL
        )
        OR
        split_part((storage.filename(name)), '_', 1) IN (
          SELECT je.id::text
          FROM journal_entries je
          JOIN orders o ON je.order_id = o.id
          JOIN order_assignments oa ON oa.order_id = o.id
          WHERE oa.user_id = auth.uid() AND o.deleted_at IS NULL
        )
      )
    )
  )
);
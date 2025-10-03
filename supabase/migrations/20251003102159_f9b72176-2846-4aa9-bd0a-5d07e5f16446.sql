-- Create storage bucket for order basis files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-basis',
  'order-basis',
  false,
  10485760, -- 10MB limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
);

-- RLS policies for order-basis bucket
CREATE POLICY "Users can view their own order basis files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'order-basis' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM orders WHERE user_id = auth.uid() OR has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Users can upload files to their orders"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'order-basis' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM orders WHERE user_id = auth.uid() OR has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Users can delete their own order basis files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'order-basis' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM orders WHERE user_id = auth.uid() OR has_role(auth.uid(), 'admin')
  )
);
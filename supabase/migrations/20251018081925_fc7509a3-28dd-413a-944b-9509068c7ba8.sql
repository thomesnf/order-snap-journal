-- Update order-basis bucket to allow any MIME type
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'order-basis';

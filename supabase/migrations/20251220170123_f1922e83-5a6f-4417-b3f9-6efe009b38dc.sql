
-- Create file_collections table
CREATE TABLE public.file_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days')
);

-- Create collection_files table
CREATE TABLE public.collection_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.file_collections(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create collection_share_tokens table
CREATE TABLE public.collection_share_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.file_collections(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  revoked_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.file_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_share_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for file_collections
CREATE POLICY "Admins can manage file collections"
ON public.file_collections
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view collections via valid share token"
ON public.file_collections
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.collection_share_tokens
    WHERE collection_share_tokens.collection_id = file_collections.id
    AND collection_share_tokens.revoked_at IS NULL
    AND collection_share_tokens.expires_at > now()
  )
);

-- RLS policies for collection_files
CREATE POLICY "Admins can manage collection files"
ON public.collection_files
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view files via valid share token"
ON public.collection_files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.collection_share_tokens
    WHERE collection_share_tokens.collection_id = collection_files.collection_id
    AND collection_share_tokens.revoked_at IS NULL
    AND collection_share_tokens.expires_at > now()
  )
);

-- RLS policies for collection_share_tokens
CREATE POLICY "Admins can manage share tokens"
ON public.collection_share_tokens
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view share tokens to validate"
ON public.collection_share_tokens
FOR SELECT
USING (true);

-- Create the public storage bucket for customer deliverables
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-deliverables', 'customer-deliverables', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for customer-deliverables bucket
CREATE POLICY "Admins can upload to customer-deliverables"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'customer-deliverables' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update customer-deliverables"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'customer-deliverables' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete from customer-deliverables"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'customer-deliverables' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Public can view customer-deliverables"
ON storage.objects
FOR SELECT
USING (bucket_id = 'customer-deliverables');

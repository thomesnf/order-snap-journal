-- Fix storage security vulnerability by removing overly permissive policies
-- This removes policies that allow any authenticated user to access all files in order-basis bucket

-- Drop insecure policies that only check authentication (created 2025-10-04)
DROP POLICY IF EXISTS "Authenticated users can upload order documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view order documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update order documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete order documents" ON storage.objects;

-- Also drop older duplicate policies if they exist
DROP POLICY IF EXISTS "Users can view their own order basis files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files to their orders" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own order basis files" ON storage.objects;

-- The following secure policies from 20251009214503 migration will remain active:
-- 1. "Users can view files from assigned orders" - Restricts SELECT to orders user owns/is assigned to
-- 2. "Users can upload files to assigned orders" - Restricts INSERT to orders user owns/is assigned to  
-- 3. "Users can update their own files" - Restricts UPDATE to files user uploaded
-- 4. "Users can delete their own files or admins can delete any" - Restricts DELETE to file owner or admin

-- Note: After this migration, storage access will be properly secured based on order ownership and assignments
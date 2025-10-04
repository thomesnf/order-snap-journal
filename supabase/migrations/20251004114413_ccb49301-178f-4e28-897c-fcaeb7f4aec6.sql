-- Fix security issues: Add missing RLS policies

-- Add INSERT policy for profiles table
-- Even though a trigger creates profiles, we should have an explicit policy
-- This prevents unauthorized profile creation attempts
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Add UPDATE and DELETE policies for photos table
-- Only the user who created the photo can modify or delete it
CREATE POLICY "Users can update their own photos"
ON public.photos
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos"
ON public.photos
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
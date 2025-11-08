-- Add emergency_contact field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS emergency_contact text;
-- Create backup history table
CREATE TABLE public.backup_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  file_size BIGINT,
  status TEXT NOT NULL DEFAULT 'completed',
  backup_type TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  storage_path TEXT
);

-- Enable RLS
ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;

-- Only admins can view backup history
CREATE POLICY "Admins can view backup history"
ON public.backup_history
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Only admins can create backup records
CREATE POLICY "Admins can create backup records"
ON public.backup_history
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can delete old backups
CREATE POLICY "Admins can delete backup records"
ON public.backup_history
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Add backup schedule settings to settings table
ALTER TABLE public.settings 
ADD COLUMN backup_schedule_enabled BOOLEAN DEFAULT false,
ADD COLUMN backup_schedule_frequency TEXT DEFAULT 'weekly',
ADD COLUMN backup_schedule_day INTEGER DEFAULT 0,
ADD COLUMN backup_schedule_time TEXT DEFAULT '02:00';

-- Create index for faster queries
CREATE INDEX idx_backup_history_created_at ON public.backup_history(created_at DESC);
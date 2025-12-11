-- Create order templates table
CREATE TABLE public.order_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_title TEXT,
  default_description TEXT,
  default_priority order_priority DEFAULT 'medium',
  default_status order_status DEFAULT 'pending',
  default_stages JSONB DEFAULT '[]'::jsonb,
  default_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.order_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view templates
CREATE POLICY "Authenticated users can view templates"
ON public.order_templates
FOR SELECT
TO authenticated
USING (true);

-- Only admins can manage templates
CREATE POLICY "Admins can insert templates"
ON public.order_templates
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update templates"
ON public.order_templates
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete templates"
ON public.order_templates
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_order_templates_updated_at
BEFORE UPDATE ON public.order_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
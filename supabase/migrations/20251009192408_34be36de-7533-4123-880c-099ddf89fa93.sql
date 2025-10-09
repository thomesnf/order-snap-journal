-- Add title font size setting and update field config with new fields
ALTER TABLE public.settings 
ADD COLUMN pdf_title_font_size integer DEFAULT 24;

-- Update existing pdf_field_config to include title, logo, and journal entries
UPDATE public.settings
SET pdf_field_config = '[
  {"field": "title", "label": "Title", "visible": true, "order": 1},
  {"field": "logo", "label": "Logo", "visible": true, "order": 2},
  {"field": "status", "label": "Status", "visible": true, "order": 3},
  {"field": "priority", "label": "Priority", "visible": true, "order": 4},
  {"field": "customer", "label": "Customer", "visible": true, "order": 5},
  {"field": "customer_ref", "label": "Customer Ref", "visible": true, "order": 6},
  {"field": "location", "label": "Location", "visible": true, "order": 7},
  {"field": "due_date", "label": "Due Date", "visible": true, "order": 8},
  {"field": "description", "label": "Description", "visible": true, "order": 9},
  {"field": "summary", "label": "Summary", "visible": true, "order": 10},
  {"field": "summary_entries", "label": "Summary Entries", "visible": true, "order": 11},
  {"field": "man_hours", "label": "Man Hours", "visible": true, "order": 12},
  {"field": "hours_by_day", "label": "Hours by Day", "visible": true, "order": 13},
  {"field": "journal_entries", "label": "Journal Entries", "visible": true, "order": 14}
]'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000001';
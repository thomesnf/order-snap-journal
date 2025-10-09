-- Add PDF field configuration settings
ALTER TABLE public.settings 
ADD COLUMN pdf_field_config jsonb DEFAULT '[
  {"field": "status", "label": "Status", "visible": true, "order": 1},
  {"field": "priority", "label": "Priority", "visible": true, "order": 2},
  {"field": "customer", "label": "Customer", "visible": true, "order": 3},
  {"field": "customer_ref", "label": "Customer Ref", "visible": true, "order": 4},
  {"field": "location", "label": "Location", "visible": true, "order": 5},
  {"field": "due_date", "label": "Due Date", "visible": true, "order": 6},
  {"field": "description", "label": "Description", "visible": true, "order": 7},
  {"field": "summary", "label": "Summary", "visible": true, "order": 8},
  {"field": "summary_entries", "label": "Summary Entries", "visible": true, "order": 9},
  {"field": "man_hours", "label": "Man Hours", "visible": true, "order": 10},
  {"field": "hours_by_day", "label": "Hours by Day", "visible": true, "order": 11}
]'::jsonb;
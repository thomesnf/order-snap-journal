-- Add new order statuses: invoiced and paid
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'invoiced';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'paid';
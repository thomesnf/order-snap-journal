-- Enable realtime for order_stages table
ALTER TABLE order_stages REPLICA IDENTITY FULL;

-- Add order_stages to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE order_stages;
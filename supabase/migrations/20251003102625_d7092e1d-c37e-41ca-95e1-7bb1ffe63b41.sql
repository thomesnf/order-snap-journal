-- Add RLS policies for updating and deleting journal entries
CREATE POLICY "Users can update their own journal entries"
ON journal_entries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal entries"
ON journal_entries FOR DELETE
USING (auth.uid() = user_id);
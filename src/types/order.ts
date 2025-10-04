export interface Order {
  id: string;
  title: string;
  description: string;
  summary?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  created_at: Date;
  updated_at: Date;
  due_date?: Date;
  customer?: string;
  customer_ref?: string;
  location?: string;
  journal_entries: JournalEntry[];
  photos: Photo[];
}

export interface JournalEntry {
  id: string;
  content: string;
  created_at: Date;
  order_id: string;
  photos?: Photo[];
}

export interface Photo {
  id: string;
  url: string;
  caption?: string;
  created_at: Date;
  order_id: string;
}
export interface Order {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  customer?: string;
  customer_ref?: string;
  location?: string;
  journalEntries: JournalEntry[];
  photos: Photo[];
}

export interface JournalEntry {
  id: string;
  content: string;
  createdAt: Date;
  orderId: string;
  photos?: Photo[];
}

export interface Photo {
  id: string;
  url: string;
  caption?: string;
  createdAt: Date;
  orderId: string;
}
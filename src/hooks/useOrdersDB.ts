import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TimeEntry {
  id: string;
  order_id: string;
  work_date: string;
  hours_worked: number;
  technician_name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  stage_id: string | null;
  stage_name?: string;
}

export interface Order {
  id: string;
  title: string;
  description: string | null;
  summary: string | null;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled' | 'invoiced' | 'paid';
  priority: 'low' | 'medium' | 'high';
  customer: string | null;
  customer_ref: string | null;
  location: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  time_entries?: TimeEntry[];
  total_hours?: number;
}

export interface SummaryEntry {
  id: string;
  order_id: string;
  content: string;
  created_at: string;
  user_id: string;
}

export interface JournalEntry {
  id: string;
  order_id: string;
  content: string;
  created_at: string;
  user_id: string;
}

export interface Photo {
  id: string;
  url: string;
  caption: string | null;
  created_at: string;
  order_id: string | null;
  journal_entry_id: string | null;
  user_id: string;
}

export const useOrdersDB = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, time_entries(hours_worked)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Calculate total hours for each order
      const ordersWithHours = (data || []).map(order => {
        const timeEntries = order.time_entries as { hours_worked: number }[] | null;
        const total_hours = timeEntries?.reduce((sum, entry) => sum + Number(entry.hours_worked), 0) || 0;
        // Remove time_entries from response to keep it clean
        const { time_entries, ...orderData } = order;
        return { ...orderData, total_hours };
      });
      
      setOrders(ordersWithHours);
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Error fetching orders:', error);
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addOrder = async (orderData: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('orders')
        .insert([{ ...orderData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      // Manually refetch to ensure UI updates immediately
      await fetchOrders();
      
      toast({
        title: "Success",
        description: "Order created successfully",
      });
      
      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateOrder = async (orderId: string, updates: Partial<Order>) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      if (error) throw error;
      
      // Manually refetch to ensure UI updates immediately
      await fetchOrders();
      
      toast({
        title: "Success",
        description: "Order updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      const { error } = await supabase.rpc('soft_delete_order', {
        order_id: orderId
      });

      if (error) throw error;
      
      // Manually refetch to ensure UI updates immediately
      await fetchOrders();
      
      toast({
        title: "Success",
        description: "Order deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addJournalEntry = async (orderId: string, content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('journal_entries')
        .insert([{
          order_id: orderId,
          content,
          user_id: user.id
        }]);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Journal entry added",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateJournalEntry = async (entryId: string, content: string, created_at?: Date) => {
    try {
      const updateData: any = { content };
      if (created_at) {
        updateData.created_at = created_at.toISOString();
      }

      const { error } = await supabase
        .from('journal_entries')
        .update(updateData)
        .eq('id', entryId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Journal entry updated",
      });
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Error updating journal entry:', error);
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };


  const deleteJournalEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Journal entry deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addSummaryEntry = async (orderId: string, content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('summary_entries')
        .insert([{
          order_id: orderId,
          content,
          user_id: user.id
        }]);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Summary entry added",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateSummaryEntry = async (entryId: string, content: string) => {
    try {
      const { error } = await supabase
        .from('summary_entries')
        .update({ content })
        .eq('id', entryId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Summary entry updated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteSummaryEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('summary_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Summary entry deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getSummaryEntries = async (orderId: string): Promise<SummaryEntry[]> => {
    try {
      const { data, error } = await supabase
        .from('summary_entries')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }
  };


  const addPhoto = async (orderId: string | null, journalEntryId: string | null, url: string, caption?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('photos')
        .insert([{
          order_id: orderId,
          journal_entry_id: journalEntryId,
          url,
          caption,
          user_id: user.id
        }]);

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deletePhoto = async (photoId: string) => {
    try {
      // First, get the photo details to find the storage path
      const { data: photo, error: fetchError } = await supabase
        .from('photos')
        .select('url')
        .eq('id', photoId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from database
      const { error: deleteError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId);

      if (deleteError) throw deleteError;

      // Try to delete from storage (extract path from signed URL)
      // The URL format is: https://[project].supabase.co/storage/v1/object/sign/order-basis/journal-photos/[filename]?token=...
      if (photo?.url) {
        try {
          const urlParts = photo.url.split('/');
          const signIndex = urlParts.indexOf('sign');
          if (signIndex !== -1 && urlParts[signIndex + 1] === 'order-basis') {
            const pathParts = urlParts.slice(signIndex + 2);
            const filePath = pathParts.join('/').split('?')[0]; // Remove query params
            
            await supabase.storage
              .from('order-basis')
              .remove([filePath]);
          }
        } catch (storageError) {
          // Log but don't fail if storage deletion fails
          if (import.meta.env.DEV) {
            console.error('Failed to delete from storage:', storageError);
          }
        }
      }

      toast({
        title: "Success",
        description: "Photo deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getJournalEntries = async (orderId: string): Promise<JournalEntry[]> => {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }
  };

  const getPhotos = async (orderId?: string, journalEntryId?: string): Promise<Photo[]> => {
    try {
      let query = supabase.from('photos').select('*');
      
      if (orderId) {
        query = query.eq('order_id', orderId);
      }
      if (journalEntryId) {
        query = query.eq('journal_entry_id', journalEntryId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }
  };

  const getOrderWithDetails = async (orderId: string): Promise<Order & { journal_entries?: JournalEntry[]; photos?: Photo[] } | null> => {
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .is('deleted_at', null)
        .single();

      if (orderError) throw orderError;
      if (!order) return null;

      // Fetch journal entries with their photos
      const { data: journalEntries, error: journalError } = await supabase
        .from('journal_entries')
        .select('*, photos(*)')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (journalError) throw journalError;

      // Fetch order-level photos (not attached to journal entries)
      const { data: orderPhotos, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .eq('order_id', orderId)
        .is('journal_entry_id', null)
        .order('created_at', { ascending: false });

      if (photosError) throw photosError;

      // Fetch time entries with stage information
      const { data: timeEntries, error: timeError } = await supabase
        .from('time_entries')
        .select(`
          *,
          order_stages(name)
        `)
        .eq('order_id', orderId)
        .order('work_date', { ascending: false });

      if (timeError) throw timeError;

      // Transform to include stage_name
      const transformedTimeEntries = (timeEntries || []).map(entry => ({
        ...entry,
        stage_name: entry.order_stages?.name || null,
        order_stages: undefined // Remove the nested object
      }));

      return {
        ...order,
        journal_entries: journalEntries || [],
        photos: orderPhotos || [],
        time_entries: transformedTimeEntries || []
      };
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    orders,
    loading,
    addOrder,
    updateOrder,
    deleteOrder,
    addSummaryEntry,
    updateSummaryEntry,
    deleteSummaryEntry,
    getSummaryEntries,
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    addPhoto,
    deletePhoto,
    getJournalEntries,
    getPhotos,
    getOrderWithDetails,
    deleteTimeEntry,
  };

  async function deleteTimeEntry(timeEntryId: string) {
    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', timeEntryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Time entry deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }
};

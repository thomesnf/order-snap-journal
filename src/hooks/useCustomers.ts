import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface Customer {
  id: string;
  customer_name: string;
  customer_ref: string | null;
  created_at: string;
  updated_at: string;
}

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (isAdmin) {
      fetchCustomers();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('customer_name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      // Don't show error toast for non-admins who can't access this table
      if (isAdmin) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getCustomerById = async (customerId: string): Promise<Customer | null> => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error fetching customer:', error);
      return null;
    }
  };

  const createCustomer = async (customerData: { customer_name: string; customer_ref?: string }): Promise<Customer | null> => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([customerData])
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Customer created successfully",
      });

      // Refresh customers list
      await fetchCustomers();
      
      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const updateCustomer = async (customerId: string, updates: Partial<Customer>): Promise<void> => {
    try {
      const { error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', customerId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Customer updated successfully",
      });

      // Refresh customers list
      await fetchCustomers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    customers,
    loading,
    getCustomerById,
    createCustomer,
    updateCustomer,
    fetchCustomers,
  };
};

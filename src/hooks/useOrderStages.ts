import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OrderStage {
  id: string;
  order_id: string;
  name: string;
  description?: string;
  order_position: number;
  created_at: string;
  updated_at: string;
}

export const useOrderStages = (orderId: string) => {
  const [stages, setStages] = useState<OrderStage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStages = async () => {
    try {
      const { data, error } = await supabase
        .from('order_stages')
        .select('*')
        .eq('order_id', orderId)
        .order('order_position', { ascending: true });

      if (error) throw error;
      setStages(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStages();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`order-stages-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_stages',
          filter: `order_id=eq.${orderId}`
        },
        () => {
          fetchStages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const createStage = async (name: string, description?: string) => {
    try {
      const { error } = await supabase
        .from('order_stages')
        .insert({
          order_id: orderId,
          name,
          description,
          order_position: stages.length
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Stage created successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const updateStage = async (stageId: string, name: string, description?: string) => {
    try {
      const { error } = await supabase
        .from('order_stages')
        .update({ name, description })
        .eq('id', stageId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Stage updated successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const deleteStage = async (stageId: string) => {
    try {
      const { error } = await supabase
        .from('order_stages')
        .delete()
        .eq('id', stageId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Stage deleted successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return {
    stages,
    loading,
    createStage,
    updateStage,
    deleteStage,
    refetch: fetchStages
  };
};
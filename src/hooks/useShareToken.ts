import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ShareToken {
  id: string;
  token: string;
  expires_at: string;
  created_at: string;
  order_id: string;
  created_by: string;
  revoked_at: string | null;
}

export const useShareToken = () => {
  const [loading, setLoading] = useState(false);

  const createShareToken = async (orderId: string): Promise<ShareToken | null> => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to create a share link');
        return null;
      }

      const { data, error } = await supabase
        .from('share_tokens')
        .insert({
          order_id: orderId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      return data as unknown as ShareToken;
    } catch (error) {
      console.error('Error creating share token:', error);
      toast.error('Failed to create share link');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const revokeShareToken = async (tokenId: string): Promise<boolean> => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('share_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', tokenId);

      if (error) throw error;

      toast.success('Share link revoked');
      return true;
    } catch (error) {
      console.error('Error revoking share token:', error);
      toast.error('Failed to revoke share link');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getActiveShareTokens = async (orderId: string): Promise<ShareToken[]> => {
    try {
      const { data, error } = await supabase
        .from('share_tokens')
        .select('*')
        .eq('order_id', orderId)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data as unknown as ShareToken[]) || [];
    } catch (error) {
      console.error('Error fetching share tokens:', error);
      return [];
    }
  };

  return {
    createShareToken,
    revokeShareToken,
    getActiveShareTokens,
    loading,
  };
};

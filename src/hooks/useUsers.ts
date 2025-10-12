import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: string;
  full_name: string | null;
  email?: string;
}

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get profiles with user data
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Just use profiles without trying to get emails from auth
      // (auth.admin is not available to regular users)
      const usersWithEmails = (profiles || []).map(profile => ({
        ...profile,
        email: '',
      }));

      setUsers(usersWithEmails);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Fallback: just get profiles without email
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      
      setUsers(profiles || []);
    } finally {
      setLoading(false);
    }
  };

  return { users, loading, refetch: fetchUsers };
};

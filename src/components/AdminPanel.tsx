import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Shield, ShieldOff, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UserWithRole {
  id: string;
  full_name: string | null;
  email?: string;
  roles: string[];
}

export default function AdminPanel() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usersWithRoles = profiles?.map(profile => ({
        ...profile,
        roles: roles?.filter(r => r.user_id === profile.id).map(r => r.role) || []
      })) || [];

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminRole = async (userId: string, isCurrentlyAdmin: boolean) => {
    try {
      if (isCurrentlyAdmin) {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert([{ user_id: userId, role: 'admin' }]);

        if (error) throw error;
      }

      toast({
        title: t('success'),
        description: isCurrentlyAdmin ? "Admin role removed" : "Admin role granted",
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteUser = async () => {
    if (!userToDelete) return;

    try {
      const { error } = await supabase.auth.admin.deleteUser(userToDelete);

      if (error) throw error;

      toast({
        title: t('success'),
        description: t('userDeleted'),
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUserToDelete(null);
    }
  };

  if (loading) {
    return <div className="p-4">{t('loading')}</div>;
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>{t('userManagement')}</CardTitle>
        <CardDescription>
          {t('manageUserRoles')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {users.map(user => {
          const isAdmin = user.roles.includes('admin');
          return (
            <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">{user.full_name || 'Unknown User'}</p>
                <div className="flex gap-2 mt-1">
                  {user.roles.map(role => (
                    <Badge key={role} variant={role === 'admin' ? 'default' : 'secondary'}>
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={isAdmin ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => toggleAdminRole(user.id, isAdmin)}
                >
                  {isAdmin ? (
                    <>
                      <ShieldOff className="w-4 h-4 mr-2" />
                      {t('removeAdmin')}
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      {t('makeAdmin')}
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUserToDelete(user.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>

    <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The user account and all associated data will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={deleteUser}>
            {t('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

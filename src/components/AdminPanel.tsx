import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Shield, ShieldOff, Trash2, Plus, Edit, ArrowLeft } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { z } from 'zod';

// Validation schemas
const emailSchema = z.string().email('Invalid email address').max(255, 'Email must be less than 255 characters');
const passwordSchema = z.string()
  .min(10, 'Password must be at least 10 characters')
  .max(72, 'Password must be less than 72 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');
const fullNameSchema = z.string()
  .trim()
  .min(1, 'Full name is required')
  .max(100, 'Full name must be less than 100 characters')
  .regex(/^[a-zA-ZäöåÄÖÅ\s-']+$/, 'Full name can only contain letters, spaces, hyphens, and apostrophes');

interface UserWithRole {
  id: string;
  full_name: string | null;
  email?: string;
  roles: string[];
}

interface AdminPanelProps {
  onBack: () => void;
}

export default function AdminPanel({ onBack }: AdminPanelProps) {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editEmergencyContact, setEditEmergencyContact] = useState('');
  const [editContractFile, setEditContractFile] = useState<File | null>(null);
  const [uploadingContract, setUploadingContract] = useState(false);
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

      // Fetch emails from auth using the edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage-users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'listUsers',
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      const authUsers = result.data?.users || [];

      const usersWithRoles = profiles?.map(profile => {
        const authUser = authUsers.find((u: any) => u.id === profile.id);
        return {
          ...profile,
          email: authUser?.email,
          roles: roles?.filter(r => r.user_id === profile.id).map(r => r.role) || []
        };
      }) || [];

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
      // Get current user's ID to check if they're modifying their own role
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.id === userId && isCurrentlyAdmin) {
        const confirmSelfDemotion = window.confirm(
          "Warning: You are about to remove your own admin privileges. Are you sure you want to continue?"
        );
        
        if (!confirmSelfDemotion) {
          return;
        }
      }
      
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage-users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'deleteUser',
          userId: userToDelete,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

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

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate inputs
      const emailValidation = emailSchema.safeParse(newUserEmail);
      if (!emailValidation.success) {
        toast({
          title: t('error'),
          description: emailValidation.error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }

      const passwordValidation = passwordSchema.safeParse(newUserPassword);
      if (!passwordValidation.success) {
        toast({
          title: t('error'),
          description: passwordValidation.error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }

      const fullNameValidation = fullNameSchema.safeParse(newUserFullName);
      if (!fullNameValidation.success) {
        toast({
          title: t('error'),
          description: fullNameValidation.error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage-users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createUser',
          email: emailValidation.data,
          password: passwordValidation.data,
          fullName: fullNameValidation.data,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      toast({
        title: t('success'),
        description: 'User created successfully',
      });
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserFullName('');
      setAddUserOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openEditUser = async (user: UserWithRole) => {
    setEditingUser(user);
    setEditEmail(user.email || '');
    setEditFullName(user.full_name || '');
    setEditPassword('');
    setEditContractFile(null);
    
    // Fetch current profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone, address, emergency_contact, employment_contract_url')
      .eq('id', user.id)
      .single();
    
    if (profile) {
      setEditPhone(profile.phone || '');
      setEditAddress(profile.address || '');
      setEditEmergencyContact(profile.emergency_contact || '');
    }
    
    setEditUserOpen(true);
  };

  const updateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      // Validate inputs
      const emailValidation = emailSchema.safeParse(editEmail);
      if (!emailValidation.success) {
        toast({
          title: t('error'),
          description: emailValidation.error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }

      const fullNameValidation = fullNameSchema.safeParse(editFullName);
      if (!fullNameValidation.success) {
        toast({
          title: t('error'),
          description: fullNameValidation.error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }

      // Handle contract file upload if provided
      let contractUrl = null;
      if (editContractFile) {
        setUploadingContract(true);
        const fileExt = editContractFile.name.split('.').pop();
        const fileName = `${editingUser.id}-${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('employment-contracts')
          .upload(fileName, editContractFile);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('employment-contracts')
          .getPublicUrl(uploadData.path);
        
        contractUrl = publicUrl;
        setUploadingContract(false);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage-users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateUser',
          userId: editingUser.id,
          email: emailValidation.data,
          fullName: fullNameValidation.data,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      // Update profile with additional fields
      const updateData: any = {
        phone: editPhone,
        address: editAddress,
        emergency_contact: editEmergencyContact,
      };
      
      if (contractUrl) {
        updateData.employment_contract_url = contractUrl;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      toast({
        title: t('success'),
        description: 'User updated successfully',
      });
      
      setEditUserOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingContract(false);
    }
  };

  const updatePassword = async () => {
    if (!editingUser) return;

    try {
      // Validate password
      const passwordValidation = passwordSchema.safeParse(editPassword);
      if (!passwordValidation.success) {
        toast({
          title: t('error'),
          description: passwordValidation.error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage-users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updatePassword',
          userId: editingUser.id,
          password: passwordValidation.data,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      toast({
        title: t('success'),
        description: 'Password updated successfully',
      });
      
      setEditPassword('');
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="p-4">{t('loading')}</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>{t('userManagement')}</CardTitle>
            <CardDescription>
              {t('manageUserRoles')}
            </CardDescription>
          </div>
        <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t('addUser')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('addNewUser')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={addUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t('fullName')}</Label>
                <Input
                  id="fullName"
                  value={newUserFullName}
                  onChange={(e) => setNewUserFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  required
                  minLength={10}
                />
                <p className="text-xs text-muted-foreground">
                  Password requirements: 10+ characters, uppercase, lowercase, digit, and special character
                </p>
              </div>
              <Button type="submit" className="w-full">
                {t('createUser')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
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
                  variant="outline"
                  size="sm"
                  onClick={() => openEditUser(user)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
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

      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <form onSubmit={updateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editFullName">{t('fullName')}</Label>
              <Input
                id="editFullName"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail">{t('email')}</Label>
              <Input
                id="editEmail"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPhone">Phone Number</Label>
              <Input
                id="editPhone"
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+46 70 123 45 67"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editAddress">Address</Label>
              <Input
                id="editAddress"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Street, City, Postal Code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmergencyContact">Emergency Contact</Label>
              <Input
                id="editEmergencyContact"
                value={editEmergencyContact}
                onChange={(e) => setEditEmergencyContact(e.target.value)}
                placeholder="Name and phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editContract">Employment Contract</Label>
              <Input
                id="editContract"
                type="file"
                onChange={(e) => setEditContractFile(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPassword">{t('password')} (optional - leave blank to keep current)</Label>
              <Input
                id="editPassword"
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                minLength={6}
                placeholder="Leave blank to keep current password"
              />
              {editPassword && (
                <Button type="button" variant="outline" size="sm" onClick={updatePassword}>
                  Update Password Only
                </Button>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={uploadingContract}>
              {uploadingContract ? 'Uploading...' : 'Update User'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Order } from '@/hooks/useOrdersDB';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, User, MoreVertical, UserCog, Trash2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { formatDate, DateFormatType } from '@/utils/dateFormat';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface OrderCardProps {
  order: Order;
  onViewDetails: (order: Order) => void;
  onUpdateStatus: (orderId: string, status: Order['status']) => void;
  isAdmin?: boolean;
  onDeleteOrder?: (orderId: string) => void;
  onChangeAssignments?: (orderId: string, userIds: string[]) => void;
}

const statusColors = {
  'pending': 'bg-warning/10 text-warning border-warning/20',
  'in-progress': 'bg-primary/10 text-primary border-primary/20',
  'completed': 'bg-success/10 text-success border-success/20',
  'cancelled': 'bg-destructive/10 text-destructive border-destructive/20',
  'invoiced': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'paid': 'bg-green-500/10 text-green-500 border-green-500/20'
};

const priorityColors = {
  'low': 'bg-muted text-muted-foreground',
  'medium': 'bg-warning/10 text-warning',
  'high': 'bg-destructive/10 text-destructive'
};

export const OrderCard = ({ 
  order, 
  onViewDetails, 
  onUpdateStatus, 
  isAdmin = false,
  onDeleteOrder,
  onChangeAssignments 
}: OrderCardProps) => {
  const { t } = useLanguage();
  const [dateFormat, setDateFormat] = useState<DateFormatType>('MM/DD/YYYY');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [users, setUsers] = useState<{ id: string; email: string; full_name: string | null }[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [currentAssignments, setCurrentAssignments] = useState<string[]>([]);

  useEffect(() => {
    fetchDateFormat();
    if (isAdmin) {
      fetchUsers();
      fetchCurrentAssignments();
    }
  }, [isAdmin, order.id]);

  const fetchDateFormat = async () => {
    const { data } = await supabase
      .from('settings')
      .select('date_format')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();
    
    if (data?.date_format) {
      setDateFormat(data.date_format as DateFormatType);
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name');
    
    if (!error && data) {
      // Fetch email from auth metadata - Note: This won't work without admin privileges
      // Using a simpler approach: just use profile data
      const usersData = data.map(profile => ({
        id: profile.id,
        full_name: profile.full_name,
        email: profile.full_name || 'User' // Fallback to user ID if no name
      }));
      setUsers(usersData);
    }
  };

  const fetchCurrentAssignments = async () => {
    const { data } = await supabase
      .from('order_assignments')
      .select('user_id')
      .eq('order_id', order.id);
    
    if (data) {
      const userIds = data.map(a => a.user_id);
      setCurrentAssignments(userIds);
      setSelectedUserIds(userIds);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleDelete = async () => {
    if (onDeleteOrder) {
      await onDeleteOrder(order.id);
      setShowDeleteDialog(false);
    }
  };

  const handleChangeAssignments = async () => {
    if (onChangeAssignments) {
      await onChangeAssignments(order.id, selectedUserIds);
      setShowAssignDialog(false);
      toast.success('Order assignments updated');
    } else {
      setShowAssignDialog(false);
    }
  };

  const handleOpenAssignDialog = () => {
    fetchCurrentAssignments();
    setShowAssignDialog(true);
  };

  return (
    <Card className="bg-card shadow-card border-border/50 hover:shadow-lg transition-all duration-300 cursor-pointer" 
          onClick={() => onViewDetails(order)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground leading-tight mb-2">{order.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{order.description}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="ml-2" onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus(order.id, 'pending');
              }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('setPending')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus(order.id, 'in-progress');
              }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('setInProgress')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus(order.id, 'completed');
              }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('setCompleted')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus(order.id, 'invoiced');
              }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('setInvoiced')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus(order.id, 'paid');
              }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('setPaid')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus(order.id, 'cancelled');
              }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('setCancelled')}
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    handleOpenAssignDialog();
                  }}>
                    <UserCog className="h-4 w-4 mr-2" />
                    {t('manageAssignments')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('deleteOrder')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center gap-2 mt-3">
          <Badge className={`${statusColors[order.status]} text-xs font-medium`}>
            {t(order.status === 'in-progress' ? 'inProgress' : order.status)}
          </Badge>
          <Badge variant="outline" className={`${priorityColors[order.priority]} text-xs`}>
            {t(order.priority)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2 text-sm text-muted-foreground">
          {isAdmin && order.customer && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <div className="flex flex-col">
                <span className="truncate text-sm">{order.customer}</span>
                {order.customer_ref && (
                  <span className="text-xs text-muted-foreground">{t('ref')}: {order.customer_ref}</span>
                )}
              </div>
            </div>
          )}
          
          {order.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{order.location}</span>
            </div>
          )}
          
          {order.due_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{t('due')} {formatDate(order.due_date, dateFormat)}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            {t('updated')} {formatDate(order.updated_at, dateFormat)}
          </span>
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteOrder')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteOrderConfirm')} "{order.title}"? {t('cannotBeUndone')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Assignments Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()} className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('manageAssignments')}</DialogTitle>
            <DialogDescription>
              Select users who should have access to this order. Multiple users can be assigned.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[400px] overflow-y-auto">
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted">
                  <Checkbox
                    id={`user-${user.id}`}
                    checked={selectedUserIds.includes(user.id)}
                    onCheckedChange={() => toggleUserSelection(user.id)}
                  />
                  <label
                    htmlFor={`user-${user.id}`}
                    className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {user.full_name || user.email}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleChangeAssignments}>
              Update Assignments ({selectedUserIds.length} selected)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
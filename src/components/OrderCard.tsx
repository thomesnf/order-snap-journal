import { useState, useEffect } from 'react';
import { Order } from '@/hooks/useOrdersDB';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, User, MoreVertical, UserCog, Trash2 } from 'lucide-react';
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
import { toast } from 'sonner';

interface OrderCardProps {
  order: Order;
  onViewDetails: (order: Order) => void;
  onUpdateStatus: (orderId: string, status: Order['status']) => void;
  isAdmin?: boolean;
  onDeleteOrder?: (orderId: string) => void;
  onChangeAssignment?: (orderId: string, newUserId: string) => void;
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
  onChangeAssignment 
}: OrderCardProps) => {
  const [dateFormat, setDateFormat] = useState<DateFormatType>('MM/DD/YYYY');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [users, setUsers] = useState<{ id: string; email: string; full_name: string | null }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(order.user_id);

  useEffect(() => {
    fetchDateFormat();
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

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
      // Fetch email from auth metadata
      const usersWithEmails = await Promise.all(
        data.map(async (profile) => {
          const { data: authData } = await supabase.auth.admin.getUserById(profile.id);
          return {
            id: profile.id,
            full_name: profile.full_name,
            email: authData.user?.email || 'Unknown'
          };
        })
      );
      setUsers(usersWithEmails);
    }
  };

  const handleDelete = async () => {
    if (onDeleteOrder) {
      await onDeleteOrder(order.id);
      setShowDeleteDialog(false);
    }
  };

  const handleChangeAssignment = async () => {
    if (onChangeAssignment && selectedUserId !== order.user_id) {
      await onChangeAssignment(order.id, selectedUserId);
      setShowAssignDialog(false);
      toast.success('Order assignment updated');
    } else {
      setShowAssignDialog(false);
    }
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
          {isAdmin ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="ml-2" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  setShowAssignDialog(true);
                }}>
                  <UserCog className="h-4 w-4 mr-2" />
                  Change Assignment
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Order
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" className="ml-2" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-3">
          <Badge className={`${statusColors[order.status]} text-xs font-medium`}>
            {order.status.replace('-', ' ')}
          </Badge>
          <Badge variant="outline" className={`${priorityColors[order.priority]} text-xs`}>
            {order.priority}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2 text-sm text-muted-foreground">
          {order.customer && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <div className="flex flex-col">
                <span className="truncate text-sm">{order.customer}</span>
                {order.customer_ref && (
                  <span className="text-xs text-muted-foreground">Ref: {order.customer_ref}</span>
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
              <span>Due {formatDate(order.due_date, dateFormat)}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            Updated {formatDate(order.updated_at, dateFormat)}
          </span>
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{order.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Change Order Assignment</DialogTitle>
            <DialogDescription>
              Select a user to assign this order to. The assigned user will be able to view and work on this order.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeAssignment}>
              Update Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
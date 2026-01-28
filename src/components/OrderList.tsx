import { useState, useEffect } from 'react';
import { Order } from '@/hooks/useOrdersDB';
import { useLanguage } from '@/contexts/LanguageContext';
import { OrderCard } from './OrderCard';
import { OrderListRow } from './OrderListRow';
import { OrderNavbar } from './OrderNavbar';
import { OrderFilters } from './OrderFilters';
import { BulkActionsBar } from './BulkActionsBar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Filter, Plus, CheckSquare, Square } from 'lucide-react';
import { ManHoursCalendar } from './ManHoursCalendar';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { exportMultipleEntriesToPDF } from '@/utils/pdfExport';
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

interface OrderListProps {
  orders: Order[];
  onViewDetails: (order: Order) => void;
  onUpdateStatus: (orderId: string, status: Order['status']) => void;
  onCreateOrder: () => void;
  onShowSettings: () => void;
  onShowAdmin?: () => void;
  isAdmin: boolean;
  companyLogoUrl?: string | null;
  onDeleteOrder?: (orderId: string) => void;
  onChangeAssignments?: (orderId: string, userIds: string[]) => void;
  onDuplicateOrder?: (order: Order) => void;
}

export const OrderList = ({ 
  orders, 
  onViewDetails, 
  onUpdateStatus, 
  onCreateOrder, 
  onShowSettings,
  onShowAdmin,
  isAdmin,
  companyLogoUrl,
  onDeleteOrder,
  onChangeAssignments,
  onDuplicateOrder
}: OrderListProps) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>(() => {
    const saved = localStorage.getItem('orderListStatusFilter');
    return (saved as Order['status'] | 'all') || 'in-progress';
  });
  const [priorityFilter, setPriorityFilter] = useState<Order['priority'] | 'all'>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'due_date' | 'title'>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'card' | 'list'>(() => {
    const saved = localStorage.getItem('orderListViewMode');
    return (saved as 'card' | 'list') || 'card';
  });
  const [fullName, setFullName] = useState<string>('');
  const [showManHoursCalendar, setShowManHoursCalendar] = useState(false);
  
  // Bulk selection state
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
  
  // Dialog states for list view
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [users, setUsers] = useState<{ id: string; full_name: string | null }[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  const { user } = useAuth();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();
        
        if (data?.full_name) {
          setFullName(data.full_name);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    localStorage.setItem('orderListStatusFilter', statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    localStorage.setItem('orderListViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name');
    
    if (data) {
      setUsers(data);
    }
  };

  const fetchCurrentAssignments = async (orderId: string) => {
    const { data } = await supabase
      .from('order_assignments')
      .select('user_id')
      .eq('order_id', orderId);
    
    if (data) {
      setSelectedUserIds(data.map(a => a.user_id));
    }
  };

  const filteredOrders = orders
    .filter(order => {
      const matchesSearch = order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           order.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           order.customer?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || order.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'updated':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'due_date':
          const aDate = a.due_date ? new Date(a.due_date).getTime() : 0;
          const bDate = b.due_date ? new Date(b.due_date).getTime() : 0;
          comparison = aDate - bDate;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    'in-progress': orders.filter(o => o.status === 'in-progress').length,
    completed: orders.filter(o => o.status === 'completed').length,
    invoiced: orders.filter(o => o.status === 'invoiced').length,
    paid: orders.filter(o => o.status === 'paid').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length
  };

  const handleOpenAssignDialog = (order: Order) => {
    setSelectedOrder(order);
    fetchCurrentAssignments(order.id);
    setShowAssignDialog(true);
  };

  const handleOpenDeleteDialog = (order: Order) => {
    setSelectedOrder(order);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (selectedOrder && onDeleteOrder) {
      await onDeleteOrder(selectedOrder.id);
      setShowDeleteDialog(false);
      setSelectedOrder(null);
    }
  };

  const handleChangeAssignments = async () => {
    if (selectedOrder && onChangeAssignments) {
      await onChangeAssignments(selectedOrder.id, selectedUserIds);
      setShowAssignDialog(false);
      setSelectedOrder(null);
      toast.success(t('assignmentsUpdated'));
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Bulk selection handlers
  const handleSelectOrder = (orderId: string, selected: boolean) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(orderId);
      } else {
        next.delete(orderId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)));
  };

  const handleDeselectAll = () => {
    setSelectedOrderIds(new Set());
  };

  const handleBulkExportJournals = async () => {
    const selectedOrders = orders.filter(o => selectedOrderIds.has(o.id));
    
    // Fetch all journal entries for selected orders
    const { data: journalEntries } = await supabase
      .from('journal_entries')
      .select('*')
      .in('order_id', Array.from(selectedOrderIds))
      .order('created_at', { ascending: false });
    
    if (!journalEntries || journalEntries.length === 0) {
      toast.error('No journal entries found for selected orders');
      return;
    }

    // Get settings for PDF
    const { data: settings } = await supabase
      .from('settings')
      .select('company_logo_url, date_format')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    // Group entries by order
    const entriesByOrder = journalEntries.reduce((acc, entry) => {
      if (!acc[entry.order_id]) {
        acc[entry.order_id] = [];
      }
      acc[entry.order_id].push(entry);
      return acc;
    }, {} as Record<string, typeof journalEntries>);

    // Export each order's journals separately
    for (const order of selectedOrders) {
      const orderEntries = entriesByOrder[order.id];
      if (orderEntries && orderEntries.length > 0) {
        await exportMultipleEntriesToPDF(
          orderEntries,
          order.title,
          order,
          (localStorage.getItem('language') as 'en' | 'sv') || 'en',
          settings?.company_logo_url || undefined,
          undefined,
          undefined,
          (settings?.date_format as 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD') || 'MM/DD/YYYY'
        );
      }
    }
    
    toast.success(`Exported journals for ${selectedOrders.length} orders`);
  };

  const handleBulkAssign = () => {
    setSelectedUserIds([]);
    setShowBulkAssignDialog(true);
  };

  const handleBulkAssignConfirm = async () => {
    if (!onChangeAssignments) return;
    
    for (const orderId of selectedOrderIds) {
      await onChangeAssignments(orderId, selectedUserIds);
    }
    
    toast.success(t('bulkAssignSuccess').replace('{count}', String(selectedOrderIds.size)));
    setShowBulkAssignDialog(false);
    setSelectedOrderIds(new Set());
  };

  const handleBulkStatusChange = async (status: Order['status']) => {
    for (const orderId of selectedOrderIds) {
      await onUpdateStatus(orderId, status);
    }
    
    toast.success(t('bulkStatusSuccess').replace('{count}', String(selectedOrderIds.size)).replace('{status}', t(status === 'in-progress' ? 'inProgress' : status)));
    setSelectedOrderIds(new Set());
  };

  const handleBulkDelete = () => {
    setShowBulkDeleteDialog(true);
  };

  const handleBulkDeleteConfirm = async () => {
    if (!onDeleteOrder) return;
    
    for (const orderId of selectedOrderIds) {
      await onDeleteOrder(orderId);
    }
    
    toast.success(t('bulkDeleteSuccess').replace('{count}', String(selectedOrderIds.size)));
    setShowBulkDeleteDialog(false);
    setSelectedOrderIds(new Set());
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Navbar */}
      <OrderNavbar
        companyLogoUrl={companyLogoUrl}
        fullName={fullName}
        isAdmin={isAdmin}
        onCreateOrder={onCreateOrder}
        onShowSettings={onShowSettings}
        onShowAdmin={onShowAdmin}
        onShowCalendar={() => setShowManHoursCalendar(true)}
      />
      
      {/* Filters */}
      <div className="px-4 py-3 border-b border-border/30 bg-background/50">
        <OrderFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          viewMode={viewMode}
          setViewMode={setViewMode}
          statusCounts={statusCounts}
          onShowCalendar={() => setShowManHoursCalendar(true)}
        />
      </div>
      
      {/* Orders List */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {filteredOrders.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <Checkbox
              checked={selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0}
              onCheckedChange={(checked) => {
                if (checked) {
                  handleSelectAll();
                } else {
                  handleDeselectAll();
                }
              }}
            />
            <span className="text-sm text-muted-foreground">
              {t('selectAll')} ({filteredOrders.length})
            </span>
          </div>
        )}
        
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Filter className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">{t('noOrdersFound')}</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? t('tryAdjusting')
                : t('getStarted')
              }
            </p>
            {!searchTerm && statusFilter === 'all' && isAdmin && (
              <Button onClick={onCreateOrder} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                {t('createFirstOrder')}
              </Button>
            )}
          </div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onViewDetails={onViewDetails}
                onUpdateStatus={onUpdateStatus}
                isAdmin={isAdmin}
                onDeleteOrder={onDeleteOrder}
                onChangeAssignments={onChangeAssignments}
                onDuplicateOrder={onDuplicateOrder}
                showCheckbox={true}
                isSelected={selectedOrderIds.has(order.id)}
                onSelectChange={handleSelectOrder}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredOrders.map((order) => (
              <OrderListRow
                key={order.id}
                order={order}
                onViewDetails={onViewDetails}
                onUpdateStatus={onUpdateStatus}
                isAdmin={isAdmin}
                onDuplicateOrder={onDuplicateOrder}
                onOpenAssignDialog={handleOpenAssignDialog}
                onOpenDeleteDialog={handleOpenDeleteDialog}
                showCheckbox={true}
                isSelected={selectedOrderIds.has(order.id)}
                onSelectChange={handleSelectOrder}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedOrderIds.size}
        totalCount={filteredOrders.length}
        allSelected={selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onExportJournals={handleBulkExportJournals}
        onAssignTechnician={handleBulkAssign}
        onChangeStatus={handleBulkStatusChange}
        onDelete={handleBulkDelete}
        isAdmin={isAdmin}
      />

      <ManHoursCalendar 
        open={showManHoursCalendar} 
        onOpenChange={setShowManHoursCalendar}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteOrder')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteOrderConfirm')} "{selectedOrder?.title}"? {t('cannotBeUndone')}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('manageAssignments')}</DialogTitle>
            <DialogDescription>
              {t('selectUsersForOrder')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[400px] overflow-y-auto">
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted">
                  <Checkbox
                    id={`user-${u.id}`}
                    checked={selectedUserIds.includes(u.id)}
                    onCheckedChange={() => toggleUserSelection(u.id)}
                  />
                  <label
                    htmlFor={`user-${u.id}`}
                    className="flex-1 text-sm font-medium leading-none cursor-pointer"
                  >
                    {u.full_name || 'User'}
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
              {t('updateAssignments')} ({selectedUserIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteOrder')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('bulkDeleteConfirm').replace('{count}', String(selectedOrderIds.size))} {t('cannotBeUndone')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              {t('delete')} ({selectedOrderIds.size})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={showBulkAssignDialog} onOpenChange={setShowBulkAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('assignTechnician')}</DialogTitle>
            <DialogDescription>
              {t('selectUsersForOrder')} ({selectedOrderIds.size} {t('orders')})
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[400px] overflow-y-auto">
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted">
                  <Checkbox
                    id={`bulk-user-${u.id}`}
                    checked={selectedUserIds.includes(u.id)}
                    onCheckedChange={() => toggleUserSelection(u.id)}
                  />
                  <label
                    htmlFor={`bulk-user-${u.id}`}
                    className="flex-1 text-sm font-medium leading-none cursor-pointer"
                  >
                    {u.full_name || 'User'}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkAssignDialog(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleBulkAssignConfirm}>
              {t('updateAssignments')} ({selectedUserIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

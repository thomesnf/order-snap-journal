import { useState, useEffect } from 'react';
import { useOrdersDB, Order } from '@/hooks/useOrdersDB';
import { useAuth } from '@/hooks/useAuth';
import { OrderList } from '@/components/OrderList';
import { OrderDetails } from '@/components/OrderDetails';
import { CreateOrderForm } from '@/components/CreateOrderForm';
import { SettingsPanel } from '@/components/SettingsPanel';
import AdminPanel from '@/components/AdminPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type View = 'list' | 'details' | 'create' | 'settings' | 'admin';

const Index = () => {
  const { orders, addOrder, updateOrder, deleteOrder, addSummaryEntry, updateSummaryEntry, deleteSummaryEntry, addJournalEntry, updateJournalEntry, deleteJournalEntry, addPhoto, deletePhoto, getOrderWithDetails } = useOrdersDB();
  const { isAdmin } = useAuth();
  const [currentView, setCurrentView] = useState<View>('list');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [duplicateOrderData, setDuplicateOrderData] = useState<Order | null>(null);

  useEffect(() => {
    fetchCompanyLogo();
  }, []);

  const fetchCompanyLogo = async () => {
    const { data } = await supabase
      .from('settings')
      .select('app_logo_url')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();
    
    if (data?.app_logo_url) {
      setCompanyLogoUrl(data.app_logo_url);
    }
  };

  const handleViewDetails = async (order: Order) => {
    // Fetch order with full details (journal entries and photos)
    const orderWithDetails = await getOrderWithDetails(order.id);
    setSelectedOrder(orderWithDetails);
    setCurrentView('details');
  };

  const handleUpdateStatus = async (orderId: string, status: Order['status']) => {
    await updateOrder(orderId, { status });
    // If we're viewing this order's details, refetch it
    if (selectedOrder?.id === orderId) {
      const updatedOrder = await getOrderWithDetails(orderId);
      setSelectedOrder(updatedOrder);
    }
    // The realtime subscription will handle updating the list automatically
  };

  const handleCreateOrder = () => {
    setDuplicateOrderData(null);
    setCurrentView('create');
  };

  const handleShowSettings = () => {
    setCurrentView('settings');
  };

  const handleShowAdmin = () => {
    setCurrentView('admin');
  };

  const handleDuplicateOrder = (order: Order) => {
    setDuplicateOrderData(order);
    setCurrentView('create');
  };

  const handleOrderCreated = async (orderData: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
    try {
      await addOrder(orderData);
      setDuplicateOrderData(null);
      // Go back to list view to see the new order
      setCurrentView('list');
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  const handleAddSummaryEntry = async (orderId: string, content: string) => {
    await addSummaryEntry(orderId, content);
    const updatedOrder = await getOrderWithDetails(orderId);
    if (updatedOrder) {
      setSelectedOrder(updatedOrder);
    }
  };

  const handleUpdateSummaryEntry = async (entryId: string, content: string) => {
    await updateSummaryEntry(entryId, content);
    if (selectedOrder) {
      const updatedOrder = await getOrderWithDetails(selectedOrder.id);
      if (updatedOrder) {
        setSelectedOrder(updatedOrder);
      }
    }
  };

  const handleDeleteSummaryEntry = async (entryId: string) => {
    await deleteSummaryEntry(entryId);
    if (selectedOrder) {
      const updatedOrder = await getOrderWithDetails(selectedOrder.id);
      if (updatedOrder) {
        setSelectedOrder(updatedOrder);
      }
    }
  };

  const handleAddJournalEntry = async (orderId: string, content: string) => {
    await addJournalEntry(orderId, content);
    // Refetch the order to update the UI with the new journal entry
    const updatedOrder = await getOrderWithDetails(orderId);
    if (updatedOrder) {
      setSelectedOrder(updatedOrder);
    }
  };

  const handleUpdateJournalEntry = async (entryId: string, content: string, created_at?: Date) => {
    await updateJournalEntry(entryId, content, created_at);
    // Refetch the order to update the UI
    if (selectedOrder) {
      const updatedOrder = await getOrderWithDetails(selectedOrder.id);
      if (updatedOrder) {
        setSelectedOrder(updatedOrder);
      }
    }
  };

  const handleDeleteJournalEntry = async (entryId: string) => {
    await deleteJournalEntry(entryId);
    // Refetch the order to update the UI
    if (selectedOrder) {
      const updatedOrder = await getOrderWithDetails(selectedOrder.id);
      if (updatedOrder) {
        setSelectedOrder(updatedOrder);
      }
    }
  };

  const handleAddPhoto = async (orderId: string | null, journalEntryId: string | null, url: string, caption?: string) => {
    await addPhoto(orderId, journalEntryId, url, caption);
    // Refetch the order to update the UI with the new photo
    if (orderId) {
      const updatedOrder = await getOrderWithDetails(orderId);
      if (updatedOrder) {
        setSelectedOrder(updatedOrder);
      }
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    await deletePhoto(photoId);
    // Refetch the order to update the UI
    if (selectedOrder) {
      const updatedOrder = await getOrderWithDetails(selectedOrder.id);
      if (updatedOrder) {
        setSelectedOrder(updatedOrder);
      }
    }
  };

  const handleUpdateOrder = async (orderId: string, updates: Partial<Order>) => {
    await updateOrder(orderId, updates);
    // Refetch order to update UI
    const updatedOrder = await getOrderWithDetails(orderId);
    if (updatedOrder) {
      setSelectedOrder(updatedOrder);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    await deleteOrder(orderId);
    // If we're viewing the deleted order, go back to list
    if (selectedOrder?.id === orderId) {
      setCurrentView('list');
      setSelectedOrder(null);
    }
  };

  const handleChangeAssignments = async (orderId: string, userIds: string[]) => {
    try {
      // Validate that all user IDs exist in the profiles table
      if (userIds.length > 0) {
        const { data: validUsers, error: validationError } = await supabase
          .from('profiles')
          .select('id')
          .in('id', userIds);
        
        if (validationError) throw validationError;
        
        const validUserIds = validUsers?.map(u => u.id) || [];
        const invalidUserIds = userIds.filter(id => !validUserIds.includes(id));
        
        if (invalidUserIds.length > 0) {
          toast.error('Some selected users do not exist in the system');
          return;
        }
      }
      
      // First, get current assignments
      const { data: currentAssignments } = await supabase
        .from('order_assignments')
        .select('user_id')
        .eq('order_id', orderId);
      
      const currentUserIds = currentAssignments?.map(a => a.user_id) || [];
      
      // Remove users that are no longer assigned
      const toRemove = currentUserIds.filter(id => !userIds.includes(id));
      if (toRemove.length > 0) {
        await supabase
          .from('order_assignments')
          .delete()
          .eq('order_id', orderId)
          .in('user_id', toRemove);
      }
      
      // Add new assignments
      const toAdd = userIds.filter(id => !currentUserIds.includes(id));
      if (toAdd.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase
          .from('order_assignments')
          .insert(
            toAdd.map(userId => ({
              order_id: orderId,
              user_id: userId,
              assigned_by: user?.id
            }))
          );
      }
      
      toast.success('Order assignments updated successfully');
    } catch (error) {
      console.error('Error updating assignments:', error);
      toast.error('Failed to update assignments');
    }
  };

  const handleBack = () => {
    setDuplicateOrderData(null);
    setCurrentView('list');
    setSelectedOrder(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {currentView === 'list' && (
        <OrderList
          orders={orders}
          onViewDetails={handleViewDetails}
          onUpdateStatus={handleUpdateStatus}
          onCreateOrder={handleCreateOrder}
          onShowSettings={handleShowSettings}
          onShowAdmin={isAdmin ? handleShowAdmin : undefined}
          isAdmin={isAdmin}
          companyLogoUrl={companyLogoUrl}
          onDeleteOrder={isAdmin ? handleDeleteOrder : undefined}
          onChangeAssignments={isAdmin ? handleChangeAssignments : undefined}
          onDuplicateOrder={handleDuplicateOrder}
        />
      )}
      
      {currentView === 'details' && selectedOrder && (
        <OrderDetails
          order={selectedOrder}
          onBack={handleBack}
          onUpdate={handleUpdateOrder}
          onAddSummaryEntry={handleAddSummaryEntry}
          onUpdateSummaryEntry={handleUpdateSummaryEntry}
          onDeleteSummaryEntry={handleDeleteSummaryEntry}
          onAddJournalEntry={handleAddJournalEntry}
          onUpdateJournalEntry={handleUpdateJournalEntry}
          onDeleteJournalEntry={handleDeleteJournalEntry}
          onDeletePhoto={handleDeletePhoto}
        />
      )}
      
      {currentView === 'create' && (
        <CreateOrderForm
          onBack={handleBack}
          onCreateOrder={handleOrderCreated}
          initialData={duplicateOrderData || undefined}
        />
      )}
      
      {currentView === 'settings' && (
        <SettingsPanel onBack={handleBack} />
      )}

      {currentView === 'admin' && isAdmin && (
        <AdminPanel onBack={handleBack} />
      )}
    </div>
  );
};

export default Index;

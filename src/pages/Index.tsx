import { useState, useEffect } from 'react';
import { useOrdersDB, Order } from '@/hooks/useOrdersDB';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { OrderList } from '@/components/OrderList';
import { OrderDetails } from '@/components/OrderDetails';
import { CreateOrderForm } from '@/components/CreateOrderForm';
import { SettingsPanel } from '@/components/SettingsPanel';
import AdminPanel from '@/components/AdminPanel';
import { supabase } from '@/integrations/supabase/client';

type View = 'list' | 'details' | 'create' | 'settings' | 'admin';

const Index = () => {
  const { orders, addOrder, updateOrder, deleteOrder, addJournalEntry, updateJournalEntry, deleteJournalEntry, addPhoto, getOrderWithDetails } = useOrdersDB();
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const [currentView, setCurrentView] = useState<View>('list');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanyLogo();
  }, []);

  const fetchCompanyLogo = async () => {
    const { data } = await supabase
      .from('settings')
      .select('company_logo_url')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();
    
    if (data?.company_logo_url) {
      setCompanyLogoUrl(data.company_logo_url);
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
    // Refetch order to update UI
    if (selectedOrder?.id === orderId) {
      const updatedOrder = await getOrderWithDetails(orderId);
      setSelectedOrder(updatedOrder);
    }
  };

  const handleCreateOrder = () => {
    setCurrentView('create');
  };

  const handleShowSettings = () => {
    setCurrentView('settings');
  };

  const handleShowAdmin = () => {
    setCurrentView('admin');
  };

  const handleOrderCreated = async (orderData: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
    try {
      const newOrder = await addOrder(orderData);
      const orderWithDetails = await getOrderWithDetails(newOrder.id);
      setSelectedOrder(orderWithDetails);
      setCurrentView('details');
    } catch (error) {
      console.error('Error creating order:', error);
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

  const handleUpdateJournalEntry = async (entryId: string, content: string) => {
    await updateJournalEntry(entryId, content);
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

  const handleUpdateOrder = async (orderId: string, updates: Partial<Order>) => {
    await updateOrder(orderId, updates);
    // Refetch order to update UI
    const updatedOrder = await getOrderWithDetails(orderId);
    if (updatedOrder) {
      setSelectedOrder(updatedOrder);
    }
  };

  const handleBack = () => {
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
        />
      )}
      
      {currentView === 'details' && selectedOrder && (
        <OrderDetails
          order={selectedOrder}
          onBack={handleBack}
          onUpdate={handleUpdateOrder}
          onAddJournalEntry={handleAddJournalEntry}
          onUpdateJournalEntry={handleUpdateJournalEntry}
          onDeleteJournalEntry={handleDeleteJournalEntry}
        />
      )}
      
      {currentView === 'create' && (
        <CreateOrderForm
          onBack={handleBack}
          onCreateOrder={handleOrderCreated}
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

import { useState } from 'react';
import { useOrdersDB, Order } from '@/hooks/useOrdersDB';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { OrderList } from '@/components/OrderList';
import { OrderDetails } from '@/components/OrderDetails';
import { CreateOrderForm } from '@/components/CreateOrderForm';
import { SettingsPanel } from '@/components/SettingsPanel';
import AdminPanel from '@/components/AdminPanel';

type View = 'list' | 'details' | 'create' | 'settings' | 'admin';

const Index = () => {
  const { orders, addOrder, updateOrder, deleteOrder, addJournalEntry, addPhoto } = useOrdersDB();
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const [currentView, setCurrentView] = useState<View>('list');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setCurrentView('details');
  };

  const handleUpdateStatus = async (orderId: string, status: Order['status']) => {
    await updateOrder(orderId, { status });
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
      setSelectedOrder(newOrder);
      setCurrentView('details');
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  const handleAddJournalEntry = async (orderId: string, content: string) => {
    await addJournalEntry(orderId, content);
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
          onShowAdmin={handleShowAdmin}
          isAdmin={isAdmin}
        />
      )}
      
      {currentView === 'details' && selectedOrder && (
        <OrderDetails
          order={selectedOrder}
          onBack={handleBack}
          onUpdateStatus={handleUpdateStatus}
          onAddJournalEntry={handleAddJournalEntry}
          onAddPhoto={addPhoto}
          isAdmin={isAdmin}
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
        <div className="p-4">
          <button
            onClick={handleBack}
            className="mb-4 text-primary hover:underline"
          >
            ← {t('back')}
          </button>
          <AdminPanel />
        </div>
      )}
    </div>
  );
};

export default Index;

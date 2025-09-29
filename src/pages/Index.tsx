import { useState } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { useLanguage } from '@/contexts/LanguageContext';
import { Order, Photo } from '@/types/order';
import { OrderList } from '@/components/OrderList';
import { OrderDetails } from '@/components/OrderDetails';
import { CreateOrderForm } from '@/components/CreateOrderForm';
import { SettingsPanel } from '@/components/SettingsPanel';

type View = 'list' | 'details' | 'create' | 'settings';

const Index = () => {
  const { orders, addOrder, updateOrder, addJournalEntry, addPhoto } = useOrders();
  const { t } = useLanguage();
  const [currentView, setCurrentView] = useState<View>('list');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setCurrentView('details');
  };

  const handleUpdateStatus = (orderId: string, status: Order['status']) => {
    updateOrder(orderId, { status });
  };

  const handleCreateOrder = () => {
    setCurrentView('create');
  };

  const handleShowSettings = () => {
    setCurrentView('settings');
  };

  const handleOrderCreated = (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'journalEntries' | 'photos'>) => {
    addOrder(orderData);
  };

  const handleAddJournalEntry = (orderId: string, content: string, photos?: Photo[]) => {
    addJournalEntry(orderId, content, photos);
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
        />
      )}
      
      {currentView === 'details' && selectedOrder && (
        <OrderDetails
          order={selectedOrder}
          onBack={handleBack}
          onUpdateStatus={handleUpdateStatus}
          onAddJournalEntry={handleAddJournalEntry}
          onAddPhoto={addPhoto}
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
    </div>
  );
};

export default Index;

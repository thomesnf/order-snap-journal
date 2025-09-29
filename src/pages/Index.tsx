import { useState } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { Order } from '@/types/order';
import { OrderList } from '@/components/OrderList';
import { OrderDetails } from '@/components/OrderDetails';
import { CreateOrderForm } from '@/components/CreateOrderForm';

type View = 'list' | 'details' | 'create';

const Index = () => {
  const { orders, addOrder, updateOrder, addJournalEntry, addPhoto } = useOrders();
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

  const handleOrderCreated = (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'journalEntries' | 'photos'>) => {
    addOrder(orderData);
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
        />
      )}
      
      {currentView === 'details' && selectedOrder && (
        <OrderDetails
          order={selectedOrder}
          onBack={handleBack}
          onUpdateStatus={handleUpdateStatus}
          onAddJournalEntry={addJournalEntry}
          onAddPhoto={addPhoto}
        />
      )}
      
      {currentView === 'create' && (
        <CreateOrderForm
          onBack={handleBack}
          onCreateOrder={handleOrderCreated}
        />
      )}
    </div>
  );
};

export default Index;

import { useState } from 'react';
import { Order, JournalEntry, Photo } from '@/types/order';

// Mock data for demo - in real app this would connect to a backend
const mockOrders: Order[] = [
  {
    id: '1',
    title: 'Installation Service - Office Building',
    description: 'Install new security system at downtown office',
    status: 'in-progress',
    priority: 'high',
    customer: 'TechCorp Inc.',
    customer_ref: 'TC-2024-001',
    location: '123 Business St, Downtown',
    created_at: new Date('2024-01-15'),
    updated_at: new Date('2024-01-16'),
    due_date: new Date('2024-01-20'),
    journal_entries: [
      {
        id: '1',
        content: 'Initial site survey completed. Found optimal camera placement locations.',
        created_at: new Date('2024-01-15'),
        order_id: '1',
        photos: []
      }
    ],
    photos: []
  },
  {
    id: '2',
    title: 'Maintenance Check - Retail Store',
    description: 'Monthly maintenance check for HVAC system',
    status: 'pending',
    priority: 'medium',
    customer: 'QuickMart',
    customer_ref: 'QM-2024-0015',
    location: '456 Mall Ave, Shopping District',
    created_at: new Date('2024-01-10'),
    updated_at: new Date('2024-01-10'),
    due_date: new Date('2024-01-25'),
    journal_entries: [],
    photos: []
  }
];

export const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [loading, setLoading] = useState(false);

  const addOrder = (orderData: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'journal_entries' | 'photos'>) => {
    const newOrder: Order = {
      ...orderData,
      id: Date.now().toString(),
      created_at: new Date(),
      updated_at: new Date(),
      journal_entries: [],
      photos: []
    };
    setOrders(prev => [newOrder, ...prev]);
    return newOrder;
  };

  const updateOrder = (orderId: string, updates: Partial<Order>) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, ...updates, updated_at: new Date() }
        : order
    ));
  };

  const addJournalEntry = (orderId: string, content: string, photos: Photo[] = []) => {
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      content,
      created_at: new Date(),
      order_id: orderId,
      photos
    };
    
    setOrders(prev => prev.map(order =>
      order.id === orderId
        ? { 
            ...order, 
            journal_entries: [...order.journal_entries, newEntry],
            updated_at: new Date()
          }
        : order
    ));
  };

  const addPhoto = (orderId: string, url: string, caption?: string) => {
    const newPhoto: Photo = {
      id: Date.now().toString(),
      url,
      caption,
      created_at: new Date(),
      order_id: orderId
    };
    
    setOrders(prev => prev.map(order =>
      order.id === orderId
        ? { 
            ...order, 
            photos: [...order.photos, newPhoto],
            updated_at: new Date()
          }
        : order
    ));
  };

  const deleteOrder = (orderId: string) => {
    setOrders(prev => prev.filter(order => order.id !== orderId));
  };

  return {
    orders,
    loading,
    addOrder,
    updateOrder,
    addJournalEntry,
    addPhoto,
    deleteOrder
  };
};
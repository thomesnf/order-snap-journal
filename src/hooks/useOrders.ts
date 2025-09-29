import { useState, useEffect } from 'react';
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
    location: '123 Business St, Downtown',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-16'),
    dueDate: new Date('2024-01-20'),
    journalEntries: [
      {
        id: '1',
        content: 'Initial site survey completed. Found optimal camera placement locations.',
        createdAt: new Date('2024-01-15'),
        orderId: '1'
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
    location: '456 Mall Ave, Shopping District',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
    dueDate: new Date('2024-01-25'),
    journalEntries: [],
    photos: []
  }
];

export const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [loading, setLoading] = useState(false);

  const addOrder = (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'journalEntries' | 'photos'>) => {
    const newOrder: Order = {
      ...orderData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
      journalEntries: [],
      photos: []
    };
    setOrders(prev => [newOrder, ...prev]);
    return newOrder;
  };

  const updateOrder = (orderId: string, updates: Partial<Order>) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, ...updates, updatedAt: new Date() }
        : order
    ));
  };

  const addJournalEntry = (orderId: string, content: string) => {
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      content,
      createdAt: new Date(),
      orderId
    };
    
    setOrders(prev => prev.map(order =>
      order.id === orderId
        ? { 
            ...order, 
            journalEntries: [...order.journalEntries, newEntry],
            updatedAt: new Date()
          }
        : order
    ));
  };

  const addPhoto = (orderId: string, url: string, caption?: string) => {
    const newPhoto: Photo = {
      id: Date.now().toString(),
      url,
      caption,
      createdAt: new Date(),
      orderId
    };
    
    setOrders(prev => prev.map(order =>
      order.id === orderId
        ? { 
            ...order, 
            photos: [...order.photos, newPhoto],
            updatedAt: new Date()
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
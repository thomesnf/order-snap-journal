import { useState } from 'react';
import { Order } from '@/hooks/useOrdersDB';
import { OrderCard } from './OrderCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { Search, Filter, Plus, Settings, Shield, LogOut } from 'lucide-react';

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
  onChangeAssignment?: (orderId: string, newUserId: string) => void;
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
  onChangeAssignment
}: OrderListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('all');
  const { signOut, user } = useAuth();

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
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

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/50 p-4 z-10">
        <div className="flex items-center justify-between mb-4">
          {companyLogoUrl ? (
            <img 
              src={companyLogoUrl} 
              alt="Company Logo" 
              className="h-10 object-contain"
            />
          ) : (
            <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          )}
          <div className="flex-1 flex justify-center">
            <p className="text-sm font-medium text-foreground">{user?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onShowSettings} variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
            {isAdmin && onShowAdmin && (
              <Button onClick={onShowAdmin} variant="outline" size="sm">
                <Shield className="h-4 w-4" />
              </Button>
            )}
            <Button onClick={signOut} variant="outline" size="sm">
              <LogOut className="h-4 w-4" />
            </Button>
            <Button onClick={onCreateOrder} size="sm" className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card border-border/50"
          />
        </div>
        
        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['all', 'pending', 'in-progress', 'completed', 'invoiced', 'paid', 'cancelled'] as const).map((status) => (
            <Badge
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              className={`cursor-pointer whitespace-nowrap ${
                statusFilter === status 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-muted'
              }`}
              onClick={() => setStatusFilter(status)}
            >
              {status === 'all' ? 'All' : status.replace('-', ' ')} ({statusCounts[status]})
            </Badge>
          ))}
        </div>
      </div>
      
      {/* Orders List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Filter className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No orders found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first order'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button onClick={onCreateOrder} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create First Order
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onViewDetails={onViewDetails}
                onUpdateStatus={onUpdateStatus}
                isAdmin={isAdmin}
                onDeleteOrder={onDeleteOrder}
                onChangeAssignment={onChangeAssignment}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

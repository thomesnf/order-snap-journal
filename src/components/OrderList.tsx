import { useState, useEffect } from 'react';
import { Order } from '@/hooks/useOrdersDB';
import { useLanguage } from '@/contexts/LanguageContext';
import { OrderCard } from './OrderCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Search, Filter, Plus, Settings, Shield, LogOut, FileBarChart, Calendar, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ManHoursCalendar } from './ManHoursCalendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

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
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('all');
  const [fullName, setFullName] = useState<string>('');
  const [showManHoursCalendar, setShowManHoursCalendar] = useState(false);
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (data?.full_name) {
          setFullName(data.full_name);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

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
            <h1 className="text-2xl font-bold text-foreground">{t('orders')}</h1>
          )}
          <div className="flex-1 flex justify-center">
            <p className="text-sm font-medium text-foreground">{fullName || user?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setShowManHoursCalendar(true)}>
                  <Calendar className="h-4 w-4 mr-2" />
                  {t('calendar')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/reports')}>
                  <FileBarChart className="h-4 w-4 mr-2" />
                  {t('reports')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShowSettings}>
                  <Settings className="h-4 w-4 mr-2" />
                  {t('settings')}
                </DropdownMenuItem>
                {isAdmin && onShowAdmin && (
                  <DropdownMenuItem onClick={onShowAdmin}>
                    <Shield className="h-4 w-4 mr-2" />
                    {t('admin')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {isAdmin && (
              <Button onClick={onCreateOrder} size="sm" className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                {t('newOrder')}
              </Button>
            )}
          </div>
        </div>
        
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchOrders')}
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
              {status === 'all' ? t('all') : t(status === 'in-progress' ? 'inProgress' : status)} ({statusCounts[status]})
            </Badge>
          ))}
        </div>
      </div>
      
      {/* Orders List */}
      <div className="flex-1 overflow-y-auto p-4">
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
            {!searchTerm && statusFilter === 'all' && (
              <Button onClick={onCreateOrder} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                {t('createFirstOrder')}
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
                onChangeAssignments={onChangeAssignments}
                onDuplicateOrder={onDuplicateOrder}
              />
            ))}
          </div>
        )}
      </div>

      <ManHoursCalendar 
        open={showManHoursCalendar} 
        onOpenChange={setShowManHoursCalendar}
      />
    </div>
  );
};

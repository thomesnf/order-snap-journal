import { useLanguage } from '@/contexts/LanguageContext';
import { Order } from '@/hooks/useOrdersDB';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, User, MoreVertical, UserCog, Trash2, RefreshCw, Copy, ChevronRight } from 'lucide-react';
import { formatDate, DateFormatType } from '@/utils/dateFormat';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';

interface OrderListRowProps {
  order: Order;
  onViewDetails: (order: Order) => void;
  onUpdateStatus: (orderId: string, status: Order['status']) => void;
  isAdmin?: boolean;
  onDeleteOrder?: (orderId: string) => void;
  onDuplicateOrder?: (order: Order) => void;
  onOpenAssignDialog?: (order: Order) => void;
  onOpenDeleteDialog?: (order: Order) => void;
}

const statusColors = {
  'pending': 'bg-warning/10 text-warning border-warning/20',
  'in-progress': 'bg-primary/10 text-primary border-primary/20',
  'completed': 'bg-success/10 text-success border-success/20',
  'cancelled': 'bg-destructive/10 text-destructive border-destructive/20',
  'invoiced': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'paid': 'bg-green-500/10 text-green-500 border-green-500/20'
};

const priorityColors = {
  'low': 'bg-muted text-muted-foreground',
  'medium': 'bg-warning/10 text-warning',
  'high': 'bg-destructive/10 text-destructive'
};

export const OrderListRow = ({ 
  order, 
  onViewDetails, 
  onUpdateStatus, 
  isAdmin = false,
  onDuplicateOrder,
  onOpenAssignDialog,
  onOpenDeleteDialog
}: OrderListRowProps) => {
  const { t } = useLanguage();
  const [dateFormat, setDateFormat] = useState<DateFormatType>('MM/DD/YYYY');

  useEffect(() => {
    const fetchDateFormat = async () => {
      const { data } = await supabase
        .from('settings')
        .select('date_format')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .maybeSingle();
      
      if (data?.date_format) {
        setDateFormat(data.date_format as DateFormatType);
      }
    };
    fetchDateFormat();
  }, []);

  return (
    <div 
      className="flex items-center gap-3 p-3 bg-card border border-border/50 rounded-lg hover:bg-muted/50 hover:shadow-sm transition-all cursor-pointer group"
      onClick={() => onViewDetails(order)}
    >
      {/* Status indicator */}
      <div className={`w-1.5 h-12 rounded-full ${
        order.status === 'pending' ? 'bg-warning' :
        order.status === 'in-progress' ? 'bg-primary' :
        order.status === 'completed' ? 'bg-success' :
        order.status === 'invoiced' ? 'bg-blue-500' :
        order.status === 'paid' ? 'bg-green-500' :
        'bg-destructive'
      }`} />
      
      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium text-foreground truncate">{order.title}</h3>
          <Badge variant="outline" className={`${priorityColors[order.priority]} text-xs shrink-0`}>
            {t(order.priority)}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {isAdmin && order.customer && (
            <span className="flex items-center gap-1 truncate">
              <User className="h-3 w-3" />
              {order.customer}
            </span>
          )}
          {order.location && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3" />
              {order.location}
            </span>
          )}
          {order.due_date && (
            <span className="flex items-center gap-1 shrink-0">
              <Calendar className="h-3 w-3" />
              {formatDate(order.due_date, dateFormat)}
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <Badge className={`${statusColors[order.status]} text-xs shrink-0 hidden sm:flex`}>
        {t(order.status === 'in-progress' ? 'inProgress' : order.status)}
      </Badge>

      {/* Actions */}
      {isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <RefreshCw className="h-4 w-4 mr-2" />
                Status
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {(['pending', 'in-progress', 'completed', 'invoiced', 'paid', 'cancelled'] as const).map((status) => (
                  <DropdownMenuItem key={status} onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStatus(order.id, status);
                  }}>
                    {t(status === 'in-progress' ? 'setInProgress' : `set${status.charAt(0).toUpperCase() + status.slice(1)}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              if (onDuplicateOrder) onDuplicateOrder(order);
            }}>
              <Copy className="h-4 w-4 mr-2" />
              {t('duplicateOrder')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              if (onOpenAssignDialog) onOpenAssignDialog(order);
            }}>
              <UserCog className="h-4 w-4 mr-2" />
              {t('manageAssignments')}
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenDeleteDialog) onOpenDeleteDialog(order);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('deleteOrder')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

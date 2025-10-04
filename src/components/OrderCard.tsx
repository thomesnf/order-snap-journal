import { useState, useEffect } from 'react';
import { Order } from '@/hooks/useOrdersDB';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, User, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { formatDate, DateFormatType } from '@/utils/dateFormat';

interface OrderCardProps {
  order: Order;
  onViewDetails: (order: Order) => void;
  onUpdateStatus: (orderId: string, status: Order['status']) => void;
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

export const OrderCard = ({ order, onViewDetails, onUpdateStatus }: OrderCardProps) => {
  const [dateFormat, setDateFormat] = useState<DateFormatType>('MM/DD/YYYY');

  useEffect(() => {
    fetchDateFormat();
  }, []);

  const fetchDateFormat = async () => {
    const { data } = await supabase
      .from('settings')
      .select('date_format')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();
    
    if (data?.date_format) {
      setDateFormat(data.date_format as DateFormatType);
    }
  };

  return (
    <Card className="bg-card shadow-card border-border/50 hover:shadow-lg transition-all duration-300 cursor-pointer" 
          onClick={() => onViewDetails(order)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground leading-tight mb-2">{order.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{order.description}</p>
          </div>
          <Button variant="ghost" size="sm" className="ml-2" onClick={(e) => e.stopPropagation()}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2 mt-3">
          <Badge className={`${statusColors[order.status]} text-xs font-medium`}>
            {order.status.replace('-', ' ')}
          </Badge>
          <Badge variant="outline" className={`${priorityColors[order.priority]} text-xs`}>
            {order.priority}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2 text-sm text-muted-foreground">
          {order.customer && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <div className="flex flex-col">
                <span className="truncate text-sm">{order.customer}</span>
                {order.customer_ref && (
                  <span className="text-xs text-muted-foreground">Ref: {order.customer_ref}</span>
                )}
              </div>
            </div>
          )}
          
          {order.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{order.location}</span>
            </div>
          )}
          
          {order.due_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Due {formatDate(order.due_date, dateFormat)}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            Updated {formatDate(order.updated_at, dateFormat)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
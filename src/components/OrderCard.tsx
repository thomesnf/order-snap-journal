import { Order } from '@/types/order';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, User, Camera, FileText, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';

interface OrderCardProps {
  order: Order;
  onViewDetails: (order: Order) => void;
  onUpdateStatus: (orderId: string, status: Order['status']) => void;
}

const statusColors = {
  'pending': 'bg-warning/10 text-warning border-warning/20',
  'in-progress': 'bg-primary/10 text-primary border-primary/20',
  'completed': 'bg-success/10 text-success border-success/20',
  'cancelled': 'bg-destructive/10 text-destructive border-destructive/20'
};

const priorityColors = {
  'low': 'bg-muted text-muted-foreground',
  'medium': 'bg-warning/10 text-warning',
  'high': 'bg-destructive/10 text-destructive'
};

export const OrderCard = ({ order, onViewDetails, onUpdateStatus }: OrderCardProps) => {
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
              <span className="truncate">{order.customer}</span>
            </div>
          )}
          
          {order.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{order.location}</span>
            </div>
          )}
          
          {order.dueDate && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Due {format(order.dueDate, 'MMM dd, yyyy')}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>{order.journalEntries.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <Camera className="h-3 w-3" />
              <span>{order.photos.length}</span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            Updated {format(order.updatedAt, 'MMM dd')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
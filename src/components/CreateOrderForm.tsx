import { useState } from 'react';
import { Order } from '@/types/order';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, MapPin, User, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CreateOrderFormProps {
  onBack: () => void;
  onCreateOrder: (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'journalEntries' | 'photos'>) => void;
}

export const CreateOrderForm = ({ onBack, onCreateOrder }: CreateOrderFormProps) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending' as Order['status'],
    priority: 'medium' as Order['priority'],
    customer: '',
    location: '',
    dueDate: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const orderData = {
        ...formData,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined
      };
      
      onCreateOrder(orderData);
      
      toast({
        title: "Order Created",
        description: "Your new order has been created successfully."
      });
      
      onBack();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/50 p-4 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-bold text-foreground">Create New Order</h1>
        </div>
      </div>
      
      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Order Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Installation Service - Office Building"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Provide detailed description of the work to be done..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                  className="min-h-[100px]"
                />
              </div>

              {/* Priority and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value: Order['priority']) => 
                    setFormData(prev => ({ ...prev, priority: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value: Order['status']) => 
                    setFormData(prev => ({ ...prev, status: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customer */}
              <div className="space-y-2">
                <Label htmlFor="customer" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer
                </Label>
                <Input
                  id="customer"
                  placeholder="Customer or company name"
                  value={formData.customer}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer: e.target.value }))}
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </Label>
                <Input
                  id="location"
                  placeholder="Job site address or location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label htmlFor="dueDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Due Date
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="sticky bottom-4 bg-background/95 backdrop-blur-sm rounded-lg p-4 border border-border/50">
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
              disabled={isSubmitting}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Creating Order...' : 'Create Order'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
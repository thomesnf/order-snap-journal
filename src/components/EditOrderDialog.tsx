import { useState } from 'react';
import { Order } from '@/hooks/useOrdersDB';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';

const orderSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().trim().max(2000, 'Description must be less than 2000 characters').optional(),
  customer: z.string().trim().max(200, 'Customer name must be less than 200 characters').optional(),
  customer_ref: z.string().trim().max(100, 'Customer reference must be less than 100 characters').optional(),
  location: z.string().trim().max(300, 'Location must be less than 300 characters').optional(),
  due_date: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['pending', 'in-progress', 'completed', 'cancelled', 'invoiced', 'paid']),
});

interface EditOrderDialogProps {
  order: Order;
  onUpdate: (orderId: string, updates: Partial<Order>) => Promise<void>;
}

export const EditOrderDialog = ({ order, onUpdate }: EditOrderDialogProps) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: order.title,
    description: order.description || '',
    customer: order.customer || '',
    customer_ref: order.customer_ref || '',
    location: order.location || '',
    due_date: order.due_date || '',
    priority: order.priority,
    status: order.status,
  });

  const handleSave = async () => {
    try {
      // Validate form data
      const validatedData = orderSchema.parse(formData);
      
      await onUpdate(order.id, validatedData);
      toast({
        title: t('success'),
        description: t('orderUpdated'),
      });
      setOpen(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast({
          title: t('error'),
          description: firstError.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('error'),
          description: t('failedToUpdateOrder'),
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('editOrder')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('orderTitle')} *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('description')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">{t('priority')}</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: Order['priority']) =>
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('low')}</SelectItem>
                  <SelectItem value="medium">{t('medium')}</SelectItem>
                  <SelectItem value="high">{t('high')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">{t('status')}</Label>
              <Select
                value={formData.status}
                onValueChange={(value: Order['status']) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t('pending')}</SelectItem>
                  <SelectItem value="in-progress">{t('inProgress')}</SelectItem>
                  <SelectItem value="completed">{t('completed')}</SelectItem>
                  <SelectItem value="invoiced">{t('invoiced')}</SelectItem>
                  <SelectItem value="paid">{t('paid')}</SelectItem>
                  <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer">{t('customer')}</Label>
            <Input
              id="customer"
              value={formData.customer}
              onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer_ref">{t('customerRef')}</Label>
            <Input
              id="customer_ref"
              value={formData.customer_ref}
              onChange={(e) => setFormData({ ...formData, customer_ref: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">{t('location')}</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">{t('dueDate')}</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSave}>
            {t('save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
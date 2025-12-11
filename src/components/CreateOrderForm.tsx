import { useState, useEffect } from 'react';
import { Order } from '@/hooks/useOrdersDB';
import { useOrderTemplates, OrderTemplate } from '@/hooks/useOrderTemplates';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, MapPin, User, Calendar, ClipboardList } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';

// Validation schema
const orderSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().trim().min(1, 'Description is required').max(2000, 'Description must be less than 2000 characters'),
  customer: z.string().trim().max(200, 'Customer name must be less than 200 characters').optional(),
  customerRef: z.string().trim().max(100, 'Customer reference must be less than 100 characters').optional(),
  location: z.string().trim().max(300, 'Location must be less than 300 characters').optional(),
});

interface CreateOrderFormProps {
  onBack: () => void;
  onCreateOrder: (orderData: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'user_id'>, template?: OrderTemplate) => void;
  initialData?: Partial<Order>;
}

export const CreateOrderForm = ({ onBack, onCreateOrder, initialData }: CreateOrderFormProps) => {
  const { t } = useLanguage();
  const { templates, loading: templatesLoading } = useOrderTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<OrderTemplate | null>(null);
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    status: initialData?.status || 'pending' as Order['status'],
    priority: initialData?.priority || 'medium' as Order['priority'],
    customer: initialData?.customer || '',
    customerRef: initialData?.customer_ref || '',
    location: initialData?.location || '',
    dueDate: initialData?.due_date ? new Date(initialData.due_date).toISOString().split('T')[0] : ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTemplateChange = (templateId: string) => {
    if (templateId === 'none') {
      setSelectedTemplate(null);
      return;
    }
    
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setFormData(prev => ({
        ...prev,
        title: template.default_title || prev.title,
        description: template.default_description || prev.description,
        priority: template.default_priority || prev.priority,
        status: template.default_status || prev.status,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    
    try {
      // Validate input data
      const validationResult = orderSchema.safeParse({
        title: formData.title,
        description: formData.description,
        customer: formData.customer,
        customerRef: formData.customerRef,
        location: formData.location,
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast({
          title: t('validationError'),
          description: firstError.message,
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      const orderData = {
        title: validationResult.data.title,
        description: validationResult.data.description,
        summary: selectedTemplate?.default_summary || null,
        status: formData.status,
        priority: formData.priority,
        customer: validationResult.data.customer || null,
        customer_ref: validationResult.data.customerRef || null,
        location: validationResult.data.location || null,
        due_date: formData.dueDate || null
      };
      
      onCreateOrder(orderData, selectedTemplate || undefined);
      
      toast({
        title: t('orderCreated'),
        description: t('orderCreatedSuccess')
      });
      
      onBack();
    } catch (error) {
      toast({
        title: t('error'),
        description: t('failedToCreateOrder'),
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
            {t('back')}
          </Button>
          <h1 className="text-xl font-bold text-foreground">{t('createNewOrder')}</h1>
        </div>
      </div>
      
      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
          {/* Template Selection */}
          {templates.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="h-5 w-5" />
                  {t('useTemplate')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedTemplate?.id || 'none'}
                  onValueChange={handleTemplateChange}
                  disabled={templatesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectTemplate')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('noTemplate')}</SelectItem>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex flex-col items-start">
                          <span>{template.name}</span>
                          {template.description && (
                            <span className="text-xs text-muted-foreground">{template.description}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate && (
                  <div className="mt-3 p-3 bg-background/50 rounded-lg text-sm">
                    <p className="text-muted-foreground">
                      {t('templateWillPrefill')}:
                    </p>
                    <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                      {selectedTemplate.default_stages && selectedTemplate.default_stages.length > 0 && (
                        <li>• {selectedTemplate.default_stages.length} {t('stages')}</li>
                      )}
                      {selectedTemplate.default_summary && <li>• {t('summary')}</li>}
                      {selectedTemplate.default_description && <li>• {t('description')}</li>}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t('orderDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">{t('orderTitle')} *</Label>
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
                <Label htmlFor="description">{t('description')} *</Label>
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
                  <Label htmlFor="priority">{t('priority')}</Label>
                  <Select value={formData.priority} onValueChange={(value: Order['priority']) => 
                    setFormData(prev => ({ ...prev, priority: value }))
                  }>
                    <SelectTrigger>
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
                  <Select value={formData.status} onValueChange={(value: Order['status']) => 
                    setFormData(prev => ({ ...prev, status: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t('pending')}</SelectItem>
                      <SelectItem value="in-progress">{t('inProgress')}</SelectItem>
                      <SelectItem value="completed">{t('completed')}</SelectItem>
                      <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('additionalInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customer */}
              <div className="space-y-2">
                <Label htmlFor="customer" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t('customer')}
                </Label>
                <Input
                  id="customer"
                  placeholder="Customer or company name"
                  value={formData.customer}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer: e.target.value }))}
                />
              </div>

              {/* Customer Reference */}
              <div className="space-y-2">
                <Label htmlFor="customerRef">{t('customerRef')}</Label>
                <Input
                  id="customerRef"
                  placeholder="e.g., REF-2024-001, PO-12345"
                  value={formData.customerRef}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerRef: e.target.value }))}
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t('location')}
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
                  {t('dueDate')}
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
              {isSubmitting ? t('creatingOrder') : t('createOrder')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

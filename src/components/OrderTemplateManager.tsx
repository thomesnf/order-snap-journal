import { useState } from 'react';
import { useOrderTemplates, OrderTemplate, OrderTemplateStage, CreateTemplateData } from '@/hooks/useOrderTemplates';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, ClipboardList, X, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const OrderTemplateManager = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate } = useOrderTemplates();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<OrderTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CreateTemplateData>({
    name: '',
    description: '',
    default_title: '',
    default_description: '',
    default_priority: 'medium',
    default_status: 'pending',
    default_stages: [],
    default_summary: ''
  });

  const [newStageName, setNewStageName] = useState('');
  const [newStageDescription, setNewStageDescription] = useState('');

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      default_title: '',
      default_description: '',
      default_priority: 'medium',
      default_status: 'pending',
      default_stages: [],
      default_summary: ''
    });
    setEditingTemplate(null);
    setNewStageName('');
    setNewStageDescription('');
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (template: OrderTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      default_title: template.default_title || '',
      default_description: template.default_description || '',
      default_priority: template.default_priority,
      default_status: template.default_status,
      default_stages: template.default_stages || [],
      default_summary: template.default_summary || ''
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: t('error'),
        description: 'Template name is required',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, formData);
        toast({ title: t('success'), description: 'Template updated' });
      } else {
        await createTemplate(formData);
        toast({ title: t('success'), description: 'Template created' });
      }
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    try {
      await deleteTemplate(templateToDelete);
      toast({ title: t('success'), description: 'Template deleted' });
    } catch (error) {
      // Error handled in hook
    } finally {
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const addStage = () => {
    if (!newStageName.trim()) return;
    setFormData(prev => ({
      ...prev,
      default_stages: [
        ...(prev.default_stages || []),
        { name: newStageName, description: newStageDescription || undefined }
      ]
    }));
    setNewStageName('');
    setNewStageDescription('');
  };

  const removeStage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      default_stages: prev.default_stages?.filter((_, i) => i !== index) || []
    }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {t('orderTemplates')}
          </CardTitle>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {t('createTemplate')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm">{t('loading')}...</p>
        ) : templates.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            {t('noTemplates')}
          </p>
        ) : (
          <div className="space-y-2">
            {templates.map(template => (
              <div
                key={template.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{template.name}</p>
                  {template.description && (
                    <p className="text-sm text-muted-foreground truncate">{template.description}</p>
                  )}
                  <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{template.default_stages?.length || 0} stages</span>
                    <span>•</span>
                    <span className="capitalize">{template.default_priority} priority</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => openEditDialog(template)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setTemplateToDelete(template.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? t('editTemplate') : t('createTemplate')}
            </DialogTitle>
            <DialogDescription>
              {t('templateDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template Name */}
            <div className="space-y-2">
              <Label>{t('templateName')} *</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Standard Installation"
              />
            </div>

            {/* Template Description */}
            <div className="space-y-2">
              <Label>{t('description')}</Label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of when to use this template"
                rows={2}
              />
            </div>

            {/* Default Title */}
            <div className="space-y-2">
              <Label>{t('defaultTitle')}</Label>
              <Input
                value={formData.default_title}
                onChange={e => setFormData(prev => ({ ...prev, default_title: e.target.value }))}
                placeholder="Default order title"
              />
            </div>

            {/* Default Description */}
            <div className="space-y-2">
              <Label>{t('defaultDescription')}</Label>
              <Textarea
                value={formData.default_description}
                onChange={e => setFormData(prev => ({ ...prev, default_description: e.target.value }))}
                placeholder="Default order description"
                rows={3}
              />
            </div>

            {/* Priority and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('defaultPriority')}</Label>
                <Select
                  value={formData.default_priority}
                  onValueChange={(value: 'low' | 'medium' | 'high') => 
                    setFormData(prev => ({ ...prev, default_priority: value }))
                  }
                >
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
                <Label>{t('defaultStatus')}</Label>
                <Select
                  value={formData.default_status}
                  onValueChange={(value: 'pending' | 'in-progress' | 'completed' | 'cancelled') => 
                    setFormData(prev => ({ ...prev, default_status: value }))
                  }
                >
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

            {/* Default Summary */}
            <div className="space-y-2">
              <Label>{t('defaultSummary')}</Label>
              <Textarea
                value={formData.default_summary}
                onChange={e => setFormData(prev => ({ ...prev, default_summary: e.target.value }))}
                placeholder="Default summary text"
                rows={2}
              />
            </div>

            {/* Stages */}
            <div className="space-y-2">
              <Label>{t('defaultStages')}</Label>
              <div className="border rounded-lg p-3 space-y-2">
                {formData.default_stages && formData.default_stages.length > 0 ? (
                  formData.default_stages.map((stage, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{stage.name}</p>
                        {stage.description && (
                          <p className="text-xs text-muted-foreground truncate">{stage.description}</p>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => removeStage(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    {t('noStagesAdded')}
                  </p>
                )}

                {/* Add Stage */}
                <div className="pt-2 border-t space-y-2">
                  <Input
                    value={newStageName}
                    onChange={e => setNewStageName(e.target.value)}
                    placeholder={t('stageName')}
                  />
                  <Input
                    value={newStageDescription}
                    onChange={e => setNewStageDescription(e.target.value)}
                    placeholder={t('stageDescription')}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addStage}
                    disabled={!newStageName.trim()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('addStage')}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSubmit}>
              {editingTemplate ? t('save') : t('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteTemplateWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

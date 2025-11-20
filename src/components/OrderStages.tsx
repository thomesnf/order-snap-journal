import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, Edit2, Trash2, List } from 'lucide-react';
import { useOrderStages } from '@/hooks/useOrderStages';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface OrderStagesProps {
  orderId: string;
  isAdmin: boolean;
}

export const OrderStages = ({ orderId, isAdmin }: OrderStagesProps) => {
  const { t } = useLanguage();
  const { stages, createStage, updateStage, deleteStage } = useOrderStages(orderId);
  const [showDialog, setShowDialog] = useState(false);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [stageName, setStageName] = useState('');
  const [stageDescription, setStageDescription] = useState('');
  const [stageToDelete, setStageToDelete] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!stageName.trim()) return;

    if (editingStage) {
      await updateStage(editingStage, stageName, stageDescription);
    } else {
      await createStage(stageName, stageDescription);
    }

    setShowDialog(false);
    setStageName('');
    setStageDescription('');
    setEditingStage(null);
  };

  const handleEdit = (stage: any) => {
    setEditingStage(stage.id);
    setStageName(stage.name);
    setStageDescription(stage.description || '');
    setShowDialog(true);
  };

  const handleDelete = async () => {
    if (!stageToDelete) return;
    await deleteStage(stageToDelete);
    setStageToDelete(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Order Stages
            </div>
            {isAdmin && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingStage(null);
                  setStageName('');
                  setStageDescription('');
                  setShowDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Stage
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stages.length > 0 ? (
            <div className="space-y-2">
              {stages.map((stage, index) => (
                <div
                  key={stage.id}
                  className="flex items-start justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {index + 1}. {stage.name}
                      </span>
                    </div>
                    {stage.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {stage.description}
                      </p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(stage)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setStageToDelete(stage.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">
              No stages defined yet
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStage ? 'Edit Stage' : 'Add New Stage'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="stage-name">Stage Name *</Label>
              <Input
                id="stage-name"
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                placeholder="e.g., Initial Assessment"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stage-description">Description</Label>
              <Textarea
                id="stage-description"
                value={stageDescription}
                onChange={(e) => setStageDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!stageName.trim()}>
              {editingStage ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!stageToDelete} onOpenChange={() => setStageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stage</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this stage? Time entries associated with this stage will remain but be untagged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
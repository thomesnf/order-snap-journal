import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Upload, FileText, Download, Trash2, CloudUpload } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { OrderStages } from './OrderStages';

interface OrderBasisFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: any;
}

interface OrderBasisFilesProps {
  orderId: string;
  isAdmin: boolean;
}

export const OrderBasisFiles = ({ orderId, isAdmin }: OrderBasisFilesProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [files, setFiles] = useState<OrderBasisFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // File validation constants
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'sor'];

  const validateFile = (file: File): string | null => {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
      return 'File type not allowed. Allowed: PDF, Word, Excel, Images, SOR';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 10MB';
    }
    return null;
  };

  useEffect(() => {
    fetchFiles();
  }, [orderId]);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase.storage.from('order-basis').list(orderId, {
        sortBy: { column: 'created_at', order: 'desc' }
      });
      if (error) throw error;
      setFiles(data || []);
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const uploadFiles = async (filesToUpload: FileList | File[]) => {
    const filesArray = Array.from(filesToUpload);
    if (filesArray.length === 0) return;

    // Validate all files before uploading
    const invalidFiles: string[] = [];
    for (const file of filesArray) {
      const validationError = validateFile(file);
      if (validationError) {
        invalidFiles.push(`${file.name}: ${validationError}`);
      }
    }

    if (invalidFiles.length > 0) {
      toast({
        title: t('error'),
        description: invalidFiles.join('\n'),
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    try {
      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        const filePath = `${orderId}/${Date.now()}_${i}_${file.name}`;
        const { error } = await supabase.storage.from('order-basis').upload(filePath, file);
        if (error) throw error;
      }
      toast({
        title: t('success'),
        description: `${filesArray.length} file${filesArray.length > 1 ? 's' : ''} uploaded successfully`
      });
      fetchFiles();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      await uploadFiles(files);
    }
    event.target.value = '';
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      await uploadFiles(droppedFiles);
    }
  }, [orderId]);

  const handleDownload = async (name: string) => {
    try {
      const { data, error } = await supabase.storage.from('order-basis').download(`${orderId}/${name}`);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (!fileToDelete) return;
    try {
      const { error } = await supabase.storage.from('order-basis').remove([`${orderId}/${fileToDelete}`]);
      if (error) throw error;
      toast({
        title: t('success'),
        description: 'File deleted successfully'
      });
      fetchFiles();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setFileToDelete(null);
    }
  };

  return (
    <>
      <OrderStages orderId={orderId} isAdmin={isAdmin} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('orderBasis')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag and Drop Zone */}
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-lg p-6 transition-all duration-200
              ${isDragging 
                ? 'border-primary bg-primary/5 scale-[1.02]' 
                : 'border-border hover:border-muted-foreground/50'
              }
              ${uploading ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div className={`p-3 rounded-full transition-colors ${isDragging ? 'bg-primary/10' : 'bg-muted'}`}>
                <CloudUpload className={`h-8 w-8 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="font-medium">
                  {isDragging ? t('dropFilesHere') : t('dragDropFiles')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('orClickToSelect')}
                </p>
              </div>
              <Input
                id="file-upload"
                type="file"
                onChange={handleUpload}
                disabled={uploading}
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.gif,.sor"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                  <span className="text-sm">{t('uploading')}...</span>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {t('allowedFileTypes')}: PDF, Word, Excel, Images, SOR (Max 10MB)
          </p>

          {files.length > 0 ? (
            <div className="space-y-2">
              <Label>{t('uploadedFiles')}</Label>
              <div className="space-y-2">
                {files.map(file => (
                  <div
                    key={file.name}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleDownload(file.name)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setFileToDelete(file.name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">
              {t('noFilesUploaded')}
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The file will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Upload, FileText, Download, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
}

export const OrderBasisFiles = ({ orderId }: OrderBasisFilesProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [files, setFiles] = useState<OrderBasisFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, [orderId]);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('order-basis')
        .list(orderId, {
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;
      setFiles(data || []);
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const filePath = `${orderId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from('order-basis')
        .upload(filePath, file);

      if (error) throw error;

      toast({
        title: t('success'),
        description: 'File uploaded successfully',
      });

      fetchFiles();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDownload = async (name: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('order-basis')
        .download(`${orderId}/${name}`);

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
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!fileToDelete) return;

    try {
      const { error } = await supabase.storage
        .from('order-basis')
        .remove([`${orderId}/${fileToDelete}`]);

      if (error) throw error;

      toast({
        title: t('success'),
        description: 'File deleted successfully',
      });

      fetchFiles();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setFileToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('orderBasis')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">{t('uploadFiles')}</Label>
            <div className="flex gap-2">
              <Input
                id="file-upload"
                type="file"
                onChange={handleUpload}
                disabled={uploading}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.gif"
              />
              <Button disabled={uploading} size="sm" variant="outline">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Supported: PDF, Word, Excel, Images (max 10MB)
            </p>
          </div>

          {files.length > 0 ? (
            <div className="space-y-2">
              <Label>{t('uploadedFiles')}</Label>
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownload(file.name)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setFileToDelete(file.name)}
                      >
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

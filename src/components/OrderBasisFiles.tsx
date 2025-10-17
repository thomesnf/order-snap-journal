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

  // File validation constants
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/octet-stream' // For .sor files
  ];

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
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate all files before uploading
    const invalidFiles: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const validationError = validateFile(files[i]);
      if (validationError) {
        invalidFiles.push(`${files[i].name}: ${validationError}`);
      }
    }

    if (invalidFiles.length > 0) {
      toast({
        title: t('error'),
        description: invalidFiles.join('\n'),
        variant: 'destructive',
      });
      event.target.value = '';
      return;
    }

    setUploading(true);
    try {
      // Upload all files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = `${orderId}/${Date.now()}_${i}_${file.name}`;
        const { error } = await supabase.storage
          .from('order-basis')
          .upload(filePath, file);

        if (error) throw error;
      }

      toast({
        title: t('success'),
        description: `${files.length} file${files.length > 1 ? 's' : ''} uploaded successfully`,
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
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.gif,.sor"
              />
              <Button disabled={uploading} size="sm" variant="outline">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Supported: PDF, Word, Excel, Images, SOR (max 10MB)
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

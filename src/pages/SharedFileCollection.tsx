import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFileCollections, FileCollection, CollectionFile } from '@/hooks/useFileCollections';
import { format } from 'date-fns';
import { Download, FileIcon, FileText, Image, Package, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import { useToast } from '@/hooks/use-toast';

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (fileType: string | null) => {
  if (!fileType) return FileIcon;
  if (fileType.startsWith('image/')) return Image;
  if (fileType === 'application/pdf') return FileText;
  return FileIcon;
};

export default function SharedFileCollection() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const { getCollectionByToken, getFileUrl } = useFileCollections();

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [collection, setCollection] = useState<FileCollection | null>(null);
  const [files, setFiles] = useState<CollectionFile[]>([]);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const loadCollection = async () => {
      if (!token) return;
      
      setLoading(true);
      const result = await getCollectionByToken(token);
      setCollection(result.collection);
      setFiles(result.files);
      setIsValid(result.isValid);
      setLoading(false);
    };

    loadCollection();
  }, [token]);

  const downloadFile = async (file: CollectionFile) => {
    const url = getFileUrl(file.file_path);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.file_name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllAsZip = async () => {
    if (files.length === 0) return;

    setDownloading(true);
    try {
      const zip = new JSZip();

      // Fetch all files and add to zip
      for (const file of files) {
        const url = getFileUrl(file.file_path);
        const response = await fetch(url);
        const blob = await response.blob();
        zip.file(file.file_name, blob);
      }

      // Generate and download zip
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${collection?.name || 'files'}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      toast({
        title: 'Download started',
        description: 'Your files are being downloaded as a ZIP archive',
      });
    } catch (error) {
      console.error('Error creating zip:', error);
      toast({
        title: 'Download failed',
        description: 'There was an error creating the ZIP file',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const totalSize = files.reduce((acc, file) => acc + (file.file_size || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading files...</p>
        </div>
      </div>
    );
  }

  if (!isValid || !collection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Link Expired or Invalid</h1>
              <p className="text-muted-foreground">
                This file collection link is no longer available. It may have expired or been revoked.
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                Please contact the sender for a new link.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Package className="h-8 w-8" />
            <h1 className="text-2xl md:text-3xl font-bold">{collection.name}</h1>
          </div>
          {collection.description && (
            <p className="text-primary-foreground/80 mb-4">{collection.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-primary-foreground/80">
            <span className="flex items-center gap-1">
              <FileIcon className="h-4 w-4" />
              {files.length} file{files.length !== 1 ? 's' : ''}
            </span>
            <span>•</span>
            <span>{formatFileSize(totalSize)} total</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Available until {format(new Date(collection.expires_at), 'MMMM d, yyyy')}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 py-8">
        {/* Download All Button */}
        {files.length > 1 && (
          <div className="mb-6">
            <Button
              size="lg"
              onClick={downloadAllAsZip}
              disabled={downloading}
              className="w-full sm:w-auto"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Creating ZIP...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5 mr-2" />
                  Download All as ZIP ({formatFileSize(totalSize)})
                </>
              )}
            </Button>
          </div>
        )}

        {/* Files List */}
        <Card>
          <CardHeader>
            <CardTitle>Files</CardTitle>
            <CardDescription>
              Click on a file to download it individually
            </CardDescription>
          </CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No files in this collection
              </p>
            ) : (
              <div className="divide-y">
                {files.map((file) => {
                  const FileIconComponent = getFileIcon(file.file_type);
                  const isImage = file.file_type?.startsWith('image/');
                  
                  return (
                    <div
                      key={file.id}
                      className="flex items-center gap-4 py-4 hover:bg-muted/50 -mx-4 px-4 transition-colors cursor-pointer"
                      onClick={() => downloadFile(file)}
                    >
                      {/* Thumbnail or Icon */}
                      <div className="flex-shrink-0">
                        {isImage ? (
                          <div className="w-12 h-12 rounded-md overflow-hidden bg-muted">
                            <img
                              src={getFileUrl(file.file_path)}
                              alt={file.file_name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                            <FileIconComponent className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.file_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file.file_size)}
                        </p>
                      </div>

                      {/* Download Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(file);
                        }}
                      >
                        <Download className="h-5 w-5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>This link will expire on {format(new Date(collection.expires_at), 'MMMM d, yyyy')}.</p>
          <p className="mt-1">If you need access after this date, please contact the sender.</p>
        </div>
      </div>
    </div>
  );
}

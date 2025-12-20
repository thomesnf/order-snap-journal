import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useFileCollections, FileCollection, CollectionFile, CollectionShareToken } from '@/hooks/useFileCollections';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  FolderPlus, 
  Upload, 
  Trash2, 
  Link, 
  Copy, 
  ExternalLink, 
  FileIcon, 
  X,
  ChevronDown,
  ChevronRight,
  Calendar,
  FileText,
  Image
} from 'lucide-react';

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return 'Unknown';
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

export const FileCollectionManager = () => {
  const { toast } = useToast();
  const {
    loading,
    fetchCollections,
    fetchCollectionFiles,
    createCollection,
    deleteCollection,
    uploadFiles,
    deleteFile,
    createShareLink,
    revokeShareLink,
    getActiveShareLinks,
    getFileUrl,
  } = useFileCollections();

  const [collections, setCollections] = useState<FileCollection[]>([]);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [collectionFiles, setCollectionFiles] = useState<Record<string, CollectionFile[]>>({});
  const [collectionLinks, setCollectionLinks] = useState<Record<string, CollectionShareToken[]>>({});
  
  // New collection dialog
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newExpiration, setNewExpiration] = useState('30');

  // Share link dialog
  const [shareLinkOpen, setShareLinkOpen] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [linkExpiration, setLinkExpiration] = useState('30');

  // Delete confirmation
  const [deleteCollectionId, setDeleteCollectionId] = useState<string | null>(null);

  const loadCollections = useCallback(async () => {
    const data = await fetchCollections();
    setCollections(data);
  }, [fetchCollections]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const toggleCollection = async (collectionId: string) => {
    const newExpanded = new Set(expandedCollections);
    
    if (newExpanded.has(collectionId)) {
      newExpanded.delete(collectionId);
    } else {
      newExpanded.add(collectionId);
      
      // Load files and links if not already loaded
      if (!collectionFiles[collectionId]) {
        const files = await fetchCollectionFiles(collectionId);
        setCollectionFiles(prev => ({ ...prev, [collectionId]: files }));
      }
      if (!collectionLinks[collectionId]) {
        const links = await getActiveShareLinks(collectionId);
        setCollectionLinks(prev => ({ ...prev, [collectionId]: links }));
      }
    }
    
    setExpandedCollections(newExpanded);
  };

  const handleCreateCollection = async () => {
    if (!newName.trim()) {
      toast({
        title: 'Error',
        description: 'Collection name is required',
        variant: 'destructive',
      });
      return;
    }

    const collection = await createCollection(
      newName.trim(),
      newDescription.trim() || null,
      parseInt(newExpiration)
    );

    if (collection) {
      setCollections(prev => [collection, ...prev]);
      setNewCollectionOpen(false);
      setNewName('');
      setNewDescription('');
      setNewExpiration('30');
    }
  };

  const handleDeleteCollection = async (collectionId: string) => {
    const success = await deleteCollection(collectionId);
    if (success) {
      setCollections(prev => prev.filter(c => c.id !== collectionId));
      setDeleteCollectionId(null);
    }
  };

  const handleFileUpload = async (collectionId: string, fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const uploaded = await uploadFiles(collectionId, files);

    if (uploaded.length > 0) {
      setCollectionFiles(prev => ({
        ...prev,
        [collectionId]: [...(prev[collectionId] || []), ...uploaded],
      }));
    }
  };

  const handleDeleteFile = async (file: CollectionFile) => {
    const success = await deleteFile(file);
    if (success) {
      setCollectionFiles(prev => ({
        ...prev,
        [file.collection_id]: prev[file.collection_id]?.filter(f => f.id !== file.id) || [],
      }));
    }
  };

  const handleCreateShareLink = async () => {
    if (!selectedCollectionId) return;

    const token = await createShareLink(selectedCollectionId, parseInt(linkExpiration));
    if (token) {
      setCollectionLinks(prev => ({
        ...prev,
        [selectedCollectionId]: [token, ...(prev[selectedCollectionId] || [])],
      }));
      
      // Copy link to clipboard
      const shareUrl = `${window.location.origin}/files/${token.token}`;
      navigator.clipboard.writeText(shareUrl);
      
      toast({
        title: 'Link created and copied!',
        description: 'The share link has been copied to your clipboard',
      });

      setShareLinkOpen(false);
      setSelectedCollectionId(null);
    }
  };

  const handleRevokeLink = async (token: CollectionShareToken) => {
    const success = await revokeShareLink(token.id);
    if (success) {
      setCollectionLinks(prev => ({
        ...prev,
        [token.collection_id]: prev[token.collection_id]?.filter(t => t.id !== token.id) || [],
      }));
    }
  };

  const copyShareLink = (token: string) => {
    const shareUrl = `${window.location.origin}/files/${token}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: 'Copied!',
      description: 'Share link copied to clipboard',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            File Deliveries
          </span>
          <Dialog open={newCollectionOpen} onOpenChange={setNewCollectionOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <FolderPlus className="h-4 w-4 mr-2" />
                New Collection
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create File Collection</DialogTitle>
                <DialogDescription>
                  Create a new collection to share files with your customers
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="collection-name">Name</Label>
                  <Input
                    id="collection-name"
                    placeholder="e.g., Project ABC - Final Deliverables"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="collection-description">Description (optional)</Label>
                  <Textarea
                    id="collection-description"
                    placeholder="Brief description of the files..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="collection-expiration">Collection Expires In</Label>
                  <Select value={newExpiration} onValueChange={setNewExpiration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewCollectionOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCollection} disabled={loading}>
                  Create Collection
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {collections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No file collections yet</p>
            <p className="text-sm">Create a collection to start sharing files with customers</p>
          </div>
        ) : (
          <div className="space-y-3">
            {collections.map((collection) => (
              <div key={collection.id} className="border rounded-lg overflow-hidden">
                {/* Collection Header */}
                <div
                  className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleCollection(collection.id)}
                >
                  <div className="flex items-center gap-3">
                    {expandedCollections.has(collection.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <div>
                      <p className="font-medium">{collection.name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expires: {format(new Date(collection.expires_at), 'MMM d, yyyy')}
                        </span>
                        {collectionFiles[collection.id] && (
                          <span>
                            {collectionFiles[collection.id].length} file(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedCollectionId(collection.id);
                        setShareLinkOpen(true);
                      }}
                    >
                      <Link className="h-4 w-4 mr-1" />
                      Share
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteCollectionId(collection.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedCollections.has(collection.id) && (
                  <div className="p-4 space-y-4 border-t">
                    {collection.description && (
                      <p className="text-sm text-muted-foreground">{collection.description}</p>
                    )}

                    {/* File Upload */}
                    <div>
                      <Label className="text-sm font-medium">Upload Files</Label>
                      <div className="mt-2">
                        <Input
                          type="file"
                          multiple
                          onChange={(e) => handleFileUpload(collection.id, e.target.files)}
                          disabled={loading}
                          className="cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Files List */}
                    {collectionFiles[collection.id]?.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Files</Label>
                        <div className="grid gap-2">
                          {collectionFiles[collection.id].map((file) => {
                            const FileIconComponent = getFileIcon(file.file_type);
                            return (
                              <div
                                key={file.id}
                                className="flex items-center justify-between p-2 border rounded-md bg-background"
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <FileIconComponent className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                  <span className="text-sm truncate">{file.file_name}</span>
                                  <span className="text-xs text-muted-foreground flex-shrink-0">
                                    ({formatFileSize(file.file_size)})
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    asChild
                                  >
                                    <a
                                      href={getFileUrl(file.file_path)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteFile(file)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Active Share Links */}
                    {collectionLinks[collection.id]?.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Active Share Links</Label>
                        <div className="space-y-2">
                          {collectionLinks[collection.id].map((token) => (
                            <div
                              key={token.id}
                              className="flex items-center justify-between p-2 border rounded-md bg-background"
                            >
                              <div className="text-sm">
                                <span className="text-muted-foreground">Expires:</span>{' '}
                                {format(new Date(token.expires_at), 'MMM d, yyyy')}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyShareLink(token.token)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  asChild
                                >
                                  <a
                                    href={`/files/${token.token}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleRevokeLink(token)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Share Link Dialog */}
        <Dialog open={shareLinkOpen} onOpenChange={setShareLinkOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Share Link</DialogTitle>
              <DialogDescription>
                Generate a shareable link for this collection
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Link Expires In</Label>
                <Select value={linkExpiration} onValueChange={setLinkExpiration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShareLinkOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateShareLink} disabled={loading}>
                <Link className="h-4 w-4 mr-2" />
                Create & Copy Link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteCollectionId} onOpenChange={() => setDeleteCollectionId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Collection?</DialogTitle>
              <DialogDescription>
                This will permanently delete this collection and all its files. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteCollectionId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteCollectionId && handleDeleteCollection(deleteCollectionId)}
                disabled={loading}
              >
                Delete Collection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

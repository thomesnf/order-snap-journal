import { useState } from 'react';
import { Order } from '@/hooks/useOrdersDB';
import { useLanguage } from '@/contexts/LanguageContext';
import { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { takePhoto, pickImage } from '@/utils/camera';
import { TimeCalendar } from '@/components/TimeCalendar';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  User, 
  Camera, 
  FileText, 
  Send,
  Edit3,
  ImagePlus
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface OrderDetailsProps {
  order: Order;
  onBack: () => void;
  onUpdateStatus: (orderId: string, status: Order['status']) => void;
  onAddJournalEntry: (orderId: string, content: string) => void;
  onAddPhoto: (orderId: string | null, journalEntryId: string | null, url: string, caption?: string) => void;
  isAdmin: boolean;
}

const statusColors = {
  'pending': 'bg-warning/10 text-warning border-warning/20',
  'in-progress': 'bg-primary/10 text-primary border-primary/20',
  'completed': 'bg-success/10 text-success border-success/20',
  'cancelled': 'bg-destructive/10 text-destructive border-destructive/20'
};

type JournalEntry = Database['public']['Tables']['journal_entries']['Row'] & {
  photos?: Database['public']['Tables']['photos']['Row'][];
};

type Photo = Database['public']['Tables']['photos']['Row'];

type OrderWithRelations = Order & {
  journal_entries?: JournalEntry[];
  photos?: Photo[];
};

export const OrderDetails = ({ 
  order, 
  onBack, 
  onUpdateStatus, 
  onAddJournalEntry,
  onAddPhoto,
  isAdmin
}: OrderDetailsProps) => {
  const { t } = useLanguage();
  const [newJournalEntry, setNewJournalEntry] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [journalPhotos, setJournalPhotos] = useState<Photo[]>([]);

  const handleAddJournalEntry = () => {
    if (newJournalEntry.trim()) {
      onAddJournalEntry(order.id, newJournalEntry.trim());
      setNewJournalEntry('');
      setJournalPhotos([]);
      toast({
        title: t('journalEntryAdded'),
        description: "Your note has been saved."
      });
    }
  };

  const handleAddPhotoToJournal = async () => {
    try {
      const photoUrl = await takePhoto();
      const newPhoto: Photo = {
        id: crypto.randomUUID(),
        url: photoUrl,
        caption: photoCaption,
        order_id: order.id,
        journal_entry_id: null,
        user_id: order.user_id,
        created_at: new Date().toISOString()
      };
      setJournalPhotos(prev => [...prev, newPhoto]);
      setPhotoCaption('');
    } catch (error) {
      toast({
        title: t('cameraError'),
        description: t('unableToAccessCamera'),
        variant: "destructive"
      });
    }
  };

  const handleTakePhoto = async () => {
    try {
      const photoUrl = await takePhoto();
      onAddPhoto(order.id, null, photoUrl);
      toast({
        title: t('photoAdded'),
        description: "Photo added successfully."
      });
    } catch (error) {
      toast({
        title: t('cameraError'),
        description: t('unableToAccessCamera'),
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/50 p-4 z-10">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('back')}
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground truncate">{order.title}</h1>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <Badge className={`${statusColors[order.status]} text-sm font-medium`}>
            {order.status.replace('-', ' ')}
          </Badge>
          <div className="flex gap-2">
            {/* Status Progression Buttons */}
            {order.status === 'pending' && (
              <>
                <Button 
                  size="sm" 
                  onClick={() => onUpdateStatus(order.id, 'in-progress')}
                  className="bg-primary hover:bg-primary/90"
                >
                  Start Work
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => onUpdateStatus(order.id, 'cancelled')}
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/10"
                >
                  Cancel
                </Button>
              </>
            )}
            {order.status === 'in-progress' && (
              <>
                <Button 
                  size="sm" 
                  onClick={() => onUpdateStatus(order.id, 'pending')}
                  variant="outline"
                >
                  Back to Pending
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => onUpdateStatus(order.id, 'completed')}
                  className="bg-success hover:bg-success/90"
                >
                  Complete
                </Button>
              </>
            )}
            {order.status === 'completed' && (
              <Button 
                size="sm" 
                onClick={() => onUpdateStatus(order.id, 'in-progress')}
                variant="outline"
              >
                Reopen
              </Button>
            )}
            {order.status === 'cancelled' && (
              <Button 
                size="sm" 
                onClick={() => onUpdateStatus(order.id, 'pending')}
                variant="outline"
              >
                Restore
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Order Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Order Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{order.description}</p>
            
            <div className="grid grid-cols-1 gap-3">
              {order.customer && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{order.customer}</span>
                    {order.customer_ref && (
                      <span className="text-xs text-muted-foreground">Ref: {order.customer_ref}</span>
                    )}
                  </div>
                </div>
              )}
              
              {order.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{order.location}</span>
                </div>
              )}
              
              {order.due_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Due {format(new Date(order.due_date), 'MMMM dd, yyyy')}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Journal Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Journal Entries ({(order as OrderWithRelations).journal_entries?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add new entry with photo support */}
            <div className="space-y-3">
              <Label htmlFor="journal-entry">{t('addNote')}</Label>
              <Textarea
                id="journal-entry"
                placeholder="Write your notes, observations, or updates..."
                value={newJournalEntry}
                onChange={(e) => setNewJournalEntry(e.target.value)}
                className="min-h-[80px]"
              />
              
              {/* Photo caption for journal photos */}
              <div className="flex gap-2">
                <Input
                  placeholder={t('photoCaption')}
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleAddPhotoToJournal}
                  size="sm"
                  variant="outline"
                  type="button"
                >
                  <ImagePlus className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Preview photos to be attached */}
              {journalPhotos.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Photos to attach:</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {journalPhotos.map((photo) => (
                      <div key={photo.id} className="relative">
                        <img 
                          src={photo.url} 
                          alt={photo.caption || 'Preview'}
                          className="w-full h-16 object-cover rounded border border-border/30"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                          onClick={() => setJournalPhotos(prev => prev.filter(p => p.id !== photo.id))}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <Button 
                onClick={handleAddJournalEntry}
                disabled={!newJournalEntry.trim()}
                size="sm"
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {t('addEntry')}
              </Button>
            </div>
            
            {/* Entries list with photos */}
            <div className="space-y-3">
              {((order as OrderWithRelations).journal_entries || []).map((entry) => (
                <div key={entry.id} className="p-3 bg-muted/50 rounded-lg border border-border/30">
                  <p className="text-sm mb-2">{entry.content}</p>
                  
                  {/* Entry photos */}
                  {entry.photos && entry.photos.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {entry.photos.map((photo) => (
                          <div key={photo.id} className="space-y-1">
                            <img 
                              src={photo.url} 
                              alt={photo.caption || 'Journal photo'}
                              className="w-full h-20 object-cover rounded border border-border/30"
                            />
                            {photo.caption && (
                              <p className="text-xs text-muted-foreground">{photo.caption}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(entry.created_at), 'MMM dd, yyyy at hh:mm a')}
                  </p>
                </div>
              ))}
              
              {((order as OrderWithRelations).journal_entries?.length || 0) === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No journal entries yet. Add your first note above.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Time Calendar */}
        <TimeCalendar orderId={order.id} />

        {/* Photos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Photos ({(order as OrderWithRelations).photos?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add photo */}
            <div className="space-y-3">
              <Label htmlFor="photo-caption">Photo Caption (Optional)</Label>
              <Input
                id="photo-caption"
                placeholder="Describe this photo..."
                value={photoCaption}
                onChange={(e) => setPhotoCaption(e.target.value)}
              />
              <Button 
                onClick={handleAddPhotoToJournal}
                size="sm"
                className="w-full"
                variant="outline"
              >
                <Camera className="h-4 w-4 mr-2" />
                {t('takePhoto')}
              </Button>
            </div>
            
            {/* Photos grid */}
            {((order as OrderWithRelations).photos?.length || 0) > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {((order as OrderWithRelations).photos || []).map((photo) => (
                  <div key={photo.id} className="space-y-2">
                    <img 
                      src={photo.url} 
                      alt={photo.caption || 'Order photo'}
                      className="w-full h-32 object-cover rounded-lg border border-border/30"
                    />
                    {photo.caption && (
                      <p className="text-xs text-muted-foreground">{photo.caption}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(photo.created_at), 'MMM dd, hh:mm a')}
                    </p>
                  </div>
                ))}
              </div>
            )}
            
            {((order as OrderWithRelations).photos?.length || 0) === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">
                No photos yet. Capture your first photo above.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
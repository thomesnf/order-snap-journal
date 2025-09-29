import { useState } from 'react';
import { Order } from '@/types/order';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  User, 
  Camera, 
  FileText, 
  Plus,
  Send,
  Edit3
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface OrderDetailsProps {
  order: Order;
  onBack: () => void;
  onUpdateStatus: (orderId: string, status: Order['status']) => void;
  onAddJournalEntry: (orderId: string, content: string) => void;
  onAddPhoto: (orderId: string, url: string, caption?: string) => void;
}

const statusColors = {
  'pending': 'bg-warning/10 text-warning border-warning/20',
  'in-progress': 'bg-primary/10 text-primary border-primary/20',
  'completed': 'bg-success/10 text-success border-success/20',
  'cancelled': 'bg-destructive/10 text-destructive border-destructive/20'
};

export const OrderDetails = ({ 
  order, 
  onBack, 
  onUpdateStatus, 
  onAddJournalEntry,
  onAddPhoto 
}: OrderDetailsProps) => {
  const [newJournalEntry, setNewJournalEntry] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');

  const handleAddJournalEntry = () => {
    if (newJournalEntry.trim()) {
      onAddJournalEntry(order.id, newJournalEntry.trim());
      setNewJournalEntry('');
      toast({
        title: "Journal entry added",
        description: "Your note has been saved to the order."
      });
    }
  };

  const handlePhotoCapture = async () => {
    try {
      // In a real app, this would use Capacitor Camera plugin
      // For demo, we'll simulate adding a photo
      const mockPhotoUrl = `https://picsum.photos/400/300?random=${Date.now()}`;
      onAddPhoto(order.id, mockPhotoUrl, photoCaption || undefined);
      setPhotoCaption('');
      toast({
        title: "Photo added",
        description: "Photo has been attached to the order."
      });
    } catch (error) {
      toast({
        title: "Camera error",
        description: "Unable to access camera. Please try again.",
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
            Back
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
            {order.status === 'pending' && (
              <Button 
                size="sm" 
                onClick={() => onUpdateStatus(order.id, 'in-progress')}
                className="bg-primary hover:bg-primary/90"
              >
                Start Work
              </Button>
            )}
            {order.status === 'in-progress' && (
              <Button 
                size="sm" 
                onClick={() => onUpdateStatus(order.id, 'completed')}
                className="bg-success hover:bg-success/90"
              >
                Complete
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
                    {order.customerRef && (
                      <span className="text-xs text-muted-foreground">Ref: {order.customerRef}</span>
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
              
              {order.dueDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Due {format(order.dueDate, 'MMMM dd, yyyy')}</span>
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
              Journal Entries ({order.journalEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add new entry */}
            <div className="space-y-3">
              <Label htmlFor="journal-entry">Add Note</Label>
              <Textarea
                id="journal-entry"
                placeholder="Write your notes, observations, or updates..."
                value={newJournalEntry}
                onChange={(e) => setNewJournalEntry(e.target.value)}
                className="min-h-[80px]"
              />
              <Button 
                onClick={handleAddJournalEntry}
                disabled={!newJournalEntry.trim()}
                size="sm"
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            </div>
            
            {/* Entries list */}
            <div className="space-y-3">
              {order.journalEntries.map((entry) => (
                <div key={entry.id} className="p-3 bg-muted/50 rounded-lg border border-border/30">
                  <p className="text-sm mb-2">{entry.content}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(entry.createdAt, 'MMM dd, yyyy at hh:mm a')}
                  </p>
                </div>
              ))}
              
              {order.journalEntries.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No journal entries yet. Add your first note above.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Photos ({order.photos.length})
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
                onClick={handlePhotoCapture}
                size="sm"
                className="w-full"
                variant="outline"
              >
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
            </div>
            
            {/* Photos grid */}
            {order.photos.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {order.photos.map((photo) => (
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
                      {format(photo.createdAt, 'MMM dd, hh:mm a')}
                    </p>
                  </div>
                ))}
              </div>
            )}
            
            {order.photos.length === 0 && (
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
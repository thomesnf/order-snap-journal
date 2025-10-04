import { useState, useEffect } from 'react';
import { Order, JournalEntry, Photo, SummaryEntry } from '@/hooks/useOrdersDB';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, MapPin, User, Plus, Pencil, Trash2, Download, FileDown, ArrowLeft, Camera, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { EditOrderDialog } from './EditOrderDialog';
import { exportJournalEntryToPDF, exportMultipleEntriesToPDF } from '@/utils/pdfExport';
import { OrderBasisFiles } from './OrderBasisFiles';
import { TimeCalendar } from './TimeCalendar';
import { capturePhoto } from '@/utils/camera';
import { formatDate, DateFormatType } from '@/utils/dateFormat';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface OrderDetailsProps {
  order: Order;
  onBack: () => void;
  onUpdate: (orderId: string, updates: Partial<Order>) => Promise<void>;
  onAddSummaryEntry: (orderId: string, content: string) => Promise<void>;
  onUpdateSummaryEntry: (entryId: string, content: string) => Promise<void>;
  onDeleteSummaryEntry: (entryId: string) => Promise<void>;
  onAddJournalEntry: (orderId: string, content: string) => Promise<void>;
  onUpdateJournalEntry: (entryId: string, content: string, created_at?: Date) => Promise<void>;
  onDeleteJournalEntry: (entryId: string) => Promise<void>;
}

const statusColors = {
  'pending': 'bg-warning/10 text-warning border-warning/20',
  'in-progress': 'bg-primary/10 text-primary border-primary/20',
  'completed': 'bg-success/10 text-success border-success/20',
  'cancelled': 'bg-destructive/10 text-destructive border-destructive/20',
  'invoiced': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'paid': 'bg-green-500/10 text-green-500 border-green-500/20'
};

export const OrderDetails = ({ order, onBack, onUpdate, onAddSummaryEntry, onUpdateSummaryEntry, onDeleteSummaryEntry, onAddJournalEntry, onUpdateJournalEntry, onDeleteJournalEntry }: OrderDetailsProps) => {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [newSummaryEntry, setNewSummaryEntry] = useState('');
  const [summaryEntries, setSummaryEntries] = useState<SummaryEntry[]>([]);
  const [editingSummaryId, setEditingSummaryId] = useState<string | null>(null);
  const [editedSummaryContent, setEditedSummaryContent] = useState('');
  const [deleteSummaryId, setDeleteSummaryId] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState('');
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [editedDate, setEditedDate] = useState<Date | undefined>(undefined);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [entryPhotos, setEntryPhotos] = useState<Record<string, Photo[]>>({});
  const [currentEntryForPhoto, setCurrentEntryForPhoto] = useState<string | null>(null);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | undefined>();
  const [dateFormat, setDateFormat] = useState<DateFormatType>('MM/DD/YYYY');

  useEffect(() => {
    if (order) {
      fetchSummaryEntries();
      fetchJournalEntries();
    }
    fetchCompanyLogo();
    fetchDateFormat();
  }, [order?.id]);

  const fetchSummaryEntries = async () => {
    const { data, error } = await supabase
      .from('summary_entries')
      .select('*')
      .eq('order_id', order.id)
      .order('created_at', { ascending: true });

    if (error) {
      toast({
        title: t('error'),
        description: 'Failed to fetch summary entries',
        variant: 'destructive',
      });
      return;
    }

    setSummaryEntries(data || []);
  };

  const fetchCompanyLogo = async () => {
    const { data } = await supabase
      .from('settings')
      .select('company_logo_url')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();
    
    if (data?.company_logo_url) {
      setCompanyLogoUrl(data.company_logo_url);
    }
  };

  const fetchDateFormat = async () => {
    const { data } = await supabase
      .from('settings')
      .select('date_format')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();
    
    if (data?.date_format) {
      setDateFormat(data.date_format as DateFormatType);
    }
  };

  const fetchJournalEntries = async () => {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('order_id', order.id)
      .order('created_at', { ascending: true }); // oldest first

    if (error) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setJournalEntries(data || []);
    }
  };

  const fetchAllPhotos = async () => {
    if (!journalEntries.length) return;
    
    const photosMap: Record<string, Photo[]> = {};
    
    for (const entry of journalEntries) {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('journal_entry_id', entry.id)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        photosMap[entry.id] = data;
      }
    }
    
    setEntryPhotos(photosMap);
  };

  useEffect(() => {
    if (journalEntries.length > 0) {
      fetchAllPhotos();
    }
  }, [journalEntries]);


  const handleAddSummaryEntry = async () => {
    if (!newSummaryEntry.trim()) return;
    
    await onAddSummaryEntry(order.id, newSummaryEntry);
    setNewSummaryEntry('');
    fetchSummaryEntries();
  };

  const handleUpdateSummaryEntry = async () => {
    if (!editingSummaryId || !editedSummaryContent.trim()) return;
    
    await onUpdateSummaryEntry(editingSummaryId, editedSummaryContent);
    setEditingSummaryId(null);
    setEditedSummaryContent('');
    fetchSummaryEntries();
  };

  const handleDeleteSummaryEntry = async () => {
    if (!deleteSummaryId) return;
    
    await onDeleteSummaryEntry(deleteSummaryId);
    setDeleteSummaryId(null);
    fetchSummaryEntries();
  };

  const handleAddEntry = async () => {
    if (!newEntry.trim()) return;
    
    await onAddJournalEntry(order.id, newEntry);
    setNewEntry('');
    fetchJournalEntries();
  };

  const handleUpdateEntry = async () => {
    if (!editingEntryId || !editedContent.trim()) return;
    
    console.log('Updating entry with date:', editedDate);
    await onUpdateJournalEntry(editingEntryId, editedContent, editedDate);
    setEditingEntryId(null);
    setEditedContent('');
    setEditedDate(undefined);
    fetchJournalEntries();
  };

  const handleDeleteEntry = async () => {
    if (!deleteEntryId) return;
    
    await onDeleteJournalEntry(deleteEntryId);
    setDeleteEntryId(null);
    fetchJournalEntries();
  };

  const downloadPhoto = async (url: string, caption: string | null) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = caption || 'photo.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      toast({
        title: t('error'),
        description: 'Failed to download photo',
        variant: 'destructive',
      });
    }
  };

  const handleAddPhoto = async (entryId: string) => {
    try {
      const photoDataUrl = await capturePhoto();
      if (!photoDataUrl) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload to Supabase storage
      const fileName = `${entryId}_${Date.now()}.jpg`;
      const blob = await fetch(photoDataUrl).then(res => res.blob());

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('order-basis')
        .upload(`journal-photos/${fileName}`, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get a signed URL for the private bucket (valid for 1 year)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('order-basis')
        .createSignedUrl(`journal-photos/${fileName}`, 31536000); // 1 year in seconds

      if (signedUrlError) throw signedUrlError;

      const { error } = await supabase
        .from('photos')
        .insert({
          url: signedUrlData.signedUrl,
          journal_entry_id: entryId,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: t('success'),
        description: 'Photo added successfully',
      });

      fetchAllPhotos();
    } catch (error: any) {
      console.error('Photo upload error:', error);
      toast({
        title: t('error'),
        description: error.message || 'Failed to add photo',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('back')}
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportMultipleEntriesToPDF(journalEntries, order.title, order, language, companyLogoUrl, entryPhotos, summaryEntries, dateFormat)}
            disabled={journalEntries.length === 0}
          >
            <FileDown className="h-4 w-4 mr-2" />
            {t('exportAllEntries')}
          </Button>
          <EditOrderDialog order={order} onUpdate={onUpdate} />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-foreground">{order.title}</h2>

      <div className="flex items-center gap-2">
        <Badge className={`${statusColors[order.status]} text-sm`}>
          {order.status.replace('-', ' ')}
        </Badge>
        <Badge variant="outline" className="text-sm">
          {order.priority}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('orderInformation')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.description && <p className="text-muted-foreground">{order.description}</p>}
          
          {order.customer && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <div>
                <span>{order.customer}</span>
                {order.customer_ref && <span className="text-sm text-muted-foreground ml-2">Ref: {order.customer_ref}</span>}
              </div>
            </div>
          )}
          
          {order.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{order.location}</span>
            </div>
          )}
          
          {order.due_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Due {formatDate(order.due_date, dateFormat)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <OrderBasisFiles orderId={order.id} />

      <Card>
        <CardHeader>
          <CardTitle>{t('summary')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Add summary entry..."
              value={newSummaryEntry}
              onChange={(e) => setNewSummaryEntry(e.target.value)}
              className="min-h-[80px]"
            />
            <Button onClick={handleAddSummaryEntry} disabled={!newSummaryEntry.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              {t('addEntry')}
            </Button>
          </div>

          {summaryEntries.map((entry) => (
            <div key={entry.id} className="p-4 bg-muted/50 rounded-lg space-y-2">
              {editingSummaryId === entry.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editedSummaryContent}
                    onChange={(e) => setEditedSummaryContent(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleUpdateSummaryEntry} size="sm">
                      {t('save')}
                    </Button>
                    <Button 
                      onClick={() => {
                        setEditingSummaryId(null);
                        setEditedSummaryContent('');
                      }} 
                      variant="outline" 
                      size="sm"
                    >
                      {t('cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <p className="text-sm text-muted-foreground">
                      {formatDate(entry.created_at, dateFormat)}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingSummaryId(entry.id);
                          setEditedSummaryContent(entry.content);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteSummaryId(entry.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-foreground whitespace-pre-wrap">{entry.content}</p>
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('journalEntries')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder={t('addNote')}
              value={newEntry}
              onChange={(e) => setNewEntry(e.target.value)}
              className="min-h-[100px]"
            />
            <Button onClick={handleAddEntry} disabled={!newEntry.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              {t('addEntry')}
            </Button>
          </div>

          <div className="space-y-4">
            {journalEntries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="pt-4">
                  {editingEntryId === entry.id ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Entry Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !editedDate && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {editedDate ? formatDate(editedDate, dateFormat) : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={editedDate}
                              onSelect={(date) => {
                                console.log('Date selected:', date);
                                setEditedDate(date);
                              }}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <Textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleUpdateEntry}>
                          {t('save')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingEntryId(null);
                            setEditedContent('');
                            setEditedDate(undefined);
                          }}
                        >
                          {t('cancel')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-foreground whitespace-pre-wrap mb-4">{entry.content}</p>
                      
                      {/* Photos for this entry */}
                      {entryPhotos[entry.id] && entryPhotos[entry.id].length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                          {entryPhotos[entry.id].map((photo) => (
                            <div key={photo.id} className="relative group">
                              <img
                                src={photo.url}
                                alt={photo.caption || 'Journal photo'}
                                className="w-full h-32 object-cover rounded-lg"
                              />
                              <Button
                                variant="secondary"
                                size="sm"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => downloadPhoto(photo.url, photo.caption)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              {photo.caption && (
                                <p className="text-xs text-muted-foreground mt-1">{photo.caption}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddPhoto(entry.id)}
                        >
                          <Camera className="h-4 w-4 mr-1" />
                          Add Photo
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportJournalEntryToPDF(entry, order.title, language, companyLogoUrl, entryPhotos[entry.id])}
                        >
                          <FileDown className="h-4 w-4 mr-1" />
                          {t('exportPDF')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingEntryId(entry.id);
                            setEditedContent(entry.content);
                            setEditedDate(new Date(entry.created_at));
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          {t('edit')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteEntryId(entry.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {t('delete')}
                        </Button>
                      </div>

                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDate(entry.created_at, dateFormat)} at {format(new Date(entry.created_at), 'hh:mm a')}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}

            {journalEntries.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No journal entries yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      <TimeCalendar orderId={order.id} />

      <AlertDialog open={!!deleteSummaryId} onOpenChange={() => setDeleteSummaryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Summary Entry</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the summary entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSummaryEntry}>
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteEntryId} onOpenChange={() => setDeleteEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteEntry')}</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the journal entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEntry}>
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
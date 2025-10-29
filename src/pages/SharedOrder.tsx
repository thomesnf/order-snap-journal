import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calendar, MapPin, User, Clock, FileText, Camera, AlertCircle, Download } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface SharedOrderData {
  id: string;
  title: string;
  description: string;
  summary?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  customer?: string;
  customer_ref?: string;
  location?: string;
  due_date?: string;
  created_at: string;
  journal_entries: Array<{
    id: string;
    content: string;
    created_at: string;
    photos: Array<{
      id: string;
      url: string;
      caption?: string;
    }>;
  }>;
  summary_entries: Array<{
    id: string;
    content: string;
    created_at: string;
  }>;
  photos: Array<{
    id: string;
    url: string;
    caption?: string;
  }>;
  time_entries: Array<{
    id: string;
    technician_name: string;
    work_date: string;
    hours_worked: number;
    notes?: string;
  }>;
}

export default function SharedOrder() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<SharedOrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid share link');
      setLoading(false);
      return;
    }

    fetchSharedOrder();
  }, [token]);

  const fetchSharedOrder = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching shared order with token:', token);

      // First, verify the token is valid
      const { data: shareToken, error: tokenError } = await supabase
        .from('share_tokens')
        .select('order_id, expires_at')
        .eq('token', token)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      console.log('Share token query result:', { shareToken, tokenError });

      if (tokenError || !shareToken) {
        console.error('Token validation failed:', tokenError);
        setError('This share link is invalid or has expired');
        setLoading(false);
        return;
      }

      setExpiresAt(shareToken.expires_at);

      console.log('Fetching order with id:', shareToken.order_id);

      // Fetch the order with all related data
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          journal_entries (
            id,
            content,
            created_at,
            photos (id, url, caption)
          ),
          summary_entries (id, content, created_at),
          photos!photos_order_id_fkey (id, url, caption),
          time_entries (id, technician_name, work_date, hours_worked, notes)
        `)
        .eq('id', shareToken.order_id)
        .is('deleted_at', null)
        .single();

      console.log('Order query result:', { orderData, orderError });

      if (orderError || !orderData) {
        console.error('Order fetch failed:', orderError);
        setError('Unable to load order details');
        setLoading(false);
        return;
      }

      console.log('Successfully loaded order:', orderData);
      setOrder(orderData as unknown as SharedOrderData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching shared order:', err);
      setError('An error occurred while loading the order');
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'in-progress': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const downloadPhoto = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Photo downloaded');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download photo');
    }
  };

  const downloadAllPhotos = async () => {
    if (!order) return;
    
    const allPhotos = [
      ...order.photos,
      ...order.journal_entries.flatMap(entry => entry.photos)
    ];

    if (allPhotos.length === 0) {
      toast.error('No photos to download');
      return;
    }

    toast.success(`Downloading ${allPhotos.length} photos...`);
    
    for (let i = 0; i < allPhotos.length; i++) {
      const photo = allPhotos[i];
      const filename = `${order.title.replace(/[^a-z0-9]/gi, '_')}_photo_${i + 1}.jpg`;
      await downloadPhoto(photo.url, filename);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading shared order...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Unable to Load Order</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => navigate('/')}>Go to Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalHours = order.time_entries.reduce((sum, entry) => sum + Number(entry.hours_worked), 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header with expiration notice */}
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
            <AlertDescription>
            This is a read-only shared view. Link expires on {expiresAt ? format(new Date(expiresAt), 'MM/dd/yyyy HH:mm') : 'N/A'}
          </AlertDescription>
        </Alert>

        {/* Order Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-3xl mb-4">{order.title}</CardTitle>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline" className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                  <Badge variant="outline" className={getPriorityColor(order.priority)}>
                    {order.priority} priority
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {order.customer && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Customer:</strong> {order.customer}
                  </span>
                </div>
              )}
              {order.customer_ref && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Reference:</strong> {order.customer_ref}
                  </span>
                </div>
              )}
              {order.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Location:</strong> {order.location}
                  </span>
                </div>
              )}
              {order.due_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Due:</strong> {format(new Date(order.due_date), 'MM/dd/yyyy')}
                  </span>
                </div>
              )}
            </div>
            {order.description && (
              <>
                <Separator className="my-4" />
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.description}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Summary Section */}
        {order.summary && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{order.summary}</p>
            </CardContent>
          </Card>
        )}

        {/* Summary Entries */}
        {order.summary_entries.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Summary Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.summary_entries.map((entry) => (
                  <div key={entry.id} className="border-l-2 border-primary pl-4">
                    <p className="text-sm mb-1">{entry.content}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.created_at), 'MM/dd/yyyy HH:mm')}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Time Entries */}
        {order.time_entries.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Time Entries</CardTitle>
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  {totalHours.toFixed(1)} hours total
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.time_entries.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{entry.technician_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(entry.work_date), 'MM/dd/yyyy')}
                        </p>
                      </div>
                      <Badge variant="outline">{entry.hours_worked} hrs</Badge>
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground">{entry.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Photos */}
        {order.photos.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Order Photos
                </CardTitle>
                <Button onClick={downloadAllPhotos} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {order.photos.map((photo, index) => (
                  <div key={photo.id} className="relative group">
                    <img
                      src={photo.url}
                      alt={photo.caption || 'Order photo'}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => downloadPhoto(photo.url, `photo_${index + 1}.jpg`)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {photo.caption && (
                      <p className="text-xs text-muted-foreground mt-1">{photo.caption}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Journal Entries */}
        {order.journal_entries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Journal Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {order.journal_entries.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4">
                    <p className="text-sm mb-2 whitespace-pre-wrap">{entry.content}</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      {format(new Date(entry.created_at), 'MM/dd/yyyy HH:mm')}
                    </p>
                    {entry.photos.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                        {entry.photos.map((photo, photoIndex) => (
                          <div key={photo.id} className="relative group">
                            <img
                              src={photo.url}
                              alt={photo.caption || 'Journal photo'}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <Button
                              size="icon"
                              variant="secondary"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => downloadPhoto(photo.url, `journal_photo_${photoIndex + 1}.jpg`)}
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
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

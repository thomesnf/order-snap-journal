import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUsers } from '@/hooks/useUsers';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useOrdersDB } from '@/hooks/useOrdersDB';

interface TimeEntry {
  id: string;
  work_date: string;
  hours_worked: number;
  technician_name: string;
  notes: string | null;
  order_id: string;
  order_title?: string;
  user_id: string;
  stage_id: string | null;
  stage_name?: string;
}

interface ManHoursCalendarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ManHoursCalendar = ({ open, onOpenChange }: ManHoursCalendarProps) => {
  const { toast } = useToast();
  const { users } = useUsers();
  const { t } = useLanguage();
  const { user, isAdmin } = useAuth();
  const { deleteTimeEntry } = useOrdersDB();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFormat, setDateFormat] = useState('MM/dd/yyyy');
  
  // Add time entry dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [orders, setOrders] = useState<{ id: string; title: string }[]>([]);
  const [stages, setStages] = useState<{ id: string; name: string; order_id: string }[]>([]);
  const [newEntry, setNewEntry] = useState({
    orderId: '',
    technicianId: '',
    hours: '',
    workDate: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    stageId: ''
  });

  // Convert old date-fns v2 format to v3 format
  const convertDateFormat = (format: string) => {
    return format
      .replace(/DD/g, 'dd')  // Day of month
      .replace(/YYYY/g, 'yyyy'); // Year
  };

  useEffect(() => {
    if (open) {
      fetchTimeEntries();
      fetchDateFormat();
      fetchOrders();
      fetchStages();
    }
  }, [open]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, title')
        .is('deleted_at', null)
        .in('status', ['pending', 'in-progress', 'completed'])
        .order('title');

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchStages = async () => {
    try {
      const { data, error } = await supabase
        .from('order_stages')
        .select('id, name, order_id')
        .order('order_position');

      if (error) throw error;
      setStages(data || []);
    } catch (error) {
      console.error('Error fetching stages:', error);
    }
  };

  const fetchDateFormat = async () => {
    const { data } = await supabase
      .from('settings')
      .select('date_format')
      .single();
    
    if (data?.date_format) {
      setDateFormat(convertDateFormat(data.date_format));
    }
  };

  const fetchTimeEntries = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch time entries - RLS ensures users only see their own entries (where technician_id = user.id)
      const { data: entriesData, error: entriesError } = await supabase
        .from('time_entries')
        .select('*')
        .order('work_date', { ascending: false });

      if (entriesError) throw entriesError;

      // Fetch orders to get titles
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, title');

      if (ordersError) throw ordersError;

      // Fetch stages to get stage names
      const { data: stagesData, error: stagesError } = await supabase
        .from('order_stages')
        .select('id, name');

      if (stagesError) throw stagesError;

      // Create maps
      const orderTitleMap = new Map(
        (ordersData || []).map(order => [order.id, order.title])
      );
      
      const stageNameMap = new Map(
        (stagesData || []).map(stage => [stage.id, stage.name])
      );

      // Merge the data
      const transformedData = (entriesData || []).map(entry => ({
        ...entry,
        order_title: orderTitleMap.get(entry.order_id),
        stage_name: entry.stage_id ? stageNameMap.get(entry.stage_id) : undefined
      }));
      
      setTimeEntries(transformedData);
    } catch (error) {
      console.error('Error fetching time entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHoursForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return timeEntries
      .filter(entry => entry.work_date === dateStr)
      .reduce((sum, entry) => sum + Number(entry.hours_worked), 0);
  };

  const getEntriesForSelectedDate = () => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return timeEntries.filter(entry => entry.work_date === dateStr);
  };

  const getTotalHours = () => {
    return timeEntries.reduce((sum, entry) => sum + Number(entry.hours_worked), 0);
  };

  const getMonthlyTotal = (date: Date | undefined) => {
    if (!date) return 0;
    const year = date.getFullYear();
    const month = date.getMonth();
    
    return timeEntries
      .filter(entry => {
        const entryDate = new Date(entry.work_date);
        return entryDate.getFullYear() === year && entryDate.getMonth() === month;
      })
      .reduce((sum, entry) => sum + Number(entry.hours_worked), 0);
  };

  const handleAddTimeEntry = async () => {
    if (!newEntry.orderId || !newEntry.technicianId || !newEntry.hours) {
      toast({
        title: t('error'),
        description: t('fillRequired'),
        variant: 'destructive',
      });
      return;
    }

    const hours = parseFloat(newEntry.hours);
    if (isNaN(hours) || hours <= 0) {
      toast({
        title: t('error'),
        description: 'Please enter a valid number of hours',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get technician name from users
      const technician = users.find(u => u.id === newEntry.technicianId);
      if (!technician) throw new Error('Technician not found');

      const { error } = await supabase
        .from('time_entries')
        .insert({
          order_id: newEntry.orderId,
          user_id: user.id,
          technician_id: newEntry.technicianId,
          technician_name: technician.full_name || 'Unknown',
          hours_worked: hours,
          work_date: newEntry.workDate,
          notes: newEntry.notes || null,
          stage_id: newEntry.stageId || null
        });

      if (error) throw error;

      toast({
        title: t('success'),
        description: 'Time entry added successfully',
      });

      setShowAddDialog(false);
      setNewEntry({
        orderId: '',
        technicianId: '',
        hours: '',
        workDate: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
        stageId: ''
      });
      fetchTimeEntries();
    } catch (error: any) {
      console.error('Error adding time entry:', error);
      toast({
        title: t('error'),
        description: error.message || 'Failed to add time entry',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTimeEntry = async (timeEntryId: string) => {
    if (!confirm(t('confirmDelete') || 'Are you sure you want to delete this time entry?')) {
      return;
    }

    await deleteTimeEntry(timeEntryId);
    fetchTimeEntries();
  };

  const canDeleteEntry = (entry: TimeEntry) => {
    return isAdmin || entry.user_id === user?.id;
  };

  const modifiers = {
    hasHours: (date: Date) => getHoursForDate(date) > 0,
  };

  const modifiersClassNames = {
    hasHours: 'bg-primary/10 font-bold',
  };

  const selectedDateEntries = getEntriesForSelectedDate();
  const selectedDateHours = selectedDateEntries.reduce((sum, entry) => sum + Number(entry.hours_worked), 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{t('manHoursOverview')}</DialogTitle>
          </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Calendar Section */}
            <div className="space-y-4">
              <Card className="p-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={modifiers}
                  modifiersClassNames={modifiersClassNames}
                  className="rounded-md border"
                  weekStartsOn={1}
                />
              </Card>

              {/* Total Hours Card */}
              <Card className="p-4">
                <div className="space-y-3">
                  <div className="text-center pb-3 border-b">
                    <p className="text-sm text-muted-foreground mb-1">
                      {selectedDate ? format(selectedDate, 'MMMM yyyy') : 'Select Month'}
                    </p>
                    <p className="text-3xl font-bold text-primary">{getMonthlyTotal(selectedDate).toFixed(1)}h</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">{t('totalProjectHours')}</p>
                    <p className="text-2xl font-semibold text-foreground">{getTotalHours().toFixed(1)}h</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Details Section */}
            <div className="space-y-4">
              {/* Selected Date Summary */}
              <Card className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">
                      {selectedDate ? format(selectedDate, dateFormat) : t('selectDate')}
                    </h3>
                    <div className="flex items-center gap-2">
                      {selectedDateHours > 0 && (
                        <Badge className="bg-primary text-primary-foreground">
                          {selectedDateHours.toFixed(1)}h
                        </Badge>
                      )}
                      <Button onClick={() => setShowAddDialog(true)} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        {t('addTime')}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Time Entries for Selected Date */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {selectedDateEntries.length > 0 ? (
                  selectedDateEntries.map((entry) => (
                    <Card key={entry.id} className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1">
                            {entry.order_title && (
                              <p className="text-sm font-semibold text-primary mb-1">{entry.order_title}</p>
                            )}
                            <p className="font-medium">{entry.technician_name}</p>
                            {entry.stage_name && (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                {entry.stage_name}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{Number(entry.hours_worked).toFixed(1)}h</Badge>
                            {canDeleteEntry(entry) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteTimeEntry(entry.id)}
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground">{entry.notes}</p>
                        )}
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>{t('noTimeEntries')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Add Time Entry Dialog */}
    <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('addTimeEntry')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="order">{t('order')} *</Label>
            <Select value={newEntry.orderId} onValueChange={(value) => setNewEntry({ ...newEntry, orderId: value })}>
              <SelectTrigger id="order">
                <SelectValue placeholder={t('selectOrder')} />
              </SelectTrigger>
              <SelectContent>
                {orders.map((order) => (
                  <SelectItem key={order.id} value={order.id}>
                    {order.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="technician">{t('technician')} *</Label>
            <Select value={newEntry.technicianId} onValueChange={(value) => setNewEntry({ ...newEntry, technicianId: value })}>
              <SelectTrigger id="technician">
                <SelectValue placeholder={t('selectTechnician')} />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || 'Unnamed User'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {newEntry.orderId && stages.filter(s => s.order_id === newEntry.orderId).length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="stage">{t('stage')} ({t('optional')})</Label>
              <Select value={newEntry.stageId} onValueChange={(value) => setNewEntry({ ...newEntry, stageId: value })}>
                <SelectTrigger id="stage">
                  <SelectValue placeholder="No Stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages
                    .filter(s => s.order_id === newEntry.orderId)
                    .map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="hours">{t('hoursWorked')} *</Label>
            <Input
              id="hours"
              type="number"
              step="0.5"
              min="0"
              placeholder="e.g., 8.5"
              value={newEntry.hours}
              onChange={(e) => setNewEntry({ ...newEntry, hours: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workDate">{t('workDate')} *</Label>
            <div className="relative">
              <label 
                htmlFor="workDate"
                className="absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer z-10"
              >
                <CalendarIcon className="h-4 w-4 text-muted-foreground dark:text-foreground/70" />
              </label>
              <Input
                id="workDate"
                type="date"
                className="pl-10"
                value={newEntry.workDate}
                onChange={(e) => setNewEntry({ ...newEntry, workDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('notes')} ({t('optional')})</Label>
            <Input
              id="notes"
              type="text"
              placeholder={t('addAnyNotes')}
              value={newEntry.notes}
              onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAddDialog(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleAddTimeEntry}>
            {t('addEntry')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

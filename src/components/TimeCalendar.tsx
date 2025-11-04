import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatDate, DateFormatType } from '@/utils/dateFormat';

import { useLanguage } from '@/contexts/LanguageContext';
import { useOrderStages } from '@/hooks/useOrderStages';

interface TimeEntry {
  id: string;
  order_id: string;
  user_id: string;
  technician_name: string;
  work_date: string;
  hours_worked: number;
  notes: string | null;
  created_at: string;
  stage_id: string | null;
}

interface TimeCalendarProps {
  orderId: string;
}

export const TimeCalendar = ({ orderId }: TimeCalendarProps) => {
  const { user, isAdmin } = useAuth();
  const { users } = useUsers();
  const { stages } = useOrderStages(orderId);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedStageId, setSelectedStageId] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [notes, setNotes] = useState('');
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [dateFormat, setDateFormat] = useState<DateFormatType>('MM/DD/YYYY');

  useEffect(() => {
    fetchTimeEntries();
    fetchDateFormat();
  }, [orderId]);

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

  const fetchTimeEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('order_id', orderId)
        .order('work_date', { ascending: false });

      if (error) {
        console.error('Error fetching time entries:', error);
        toast({
          title: 'Error',
          description: 'Failed to load time entries: ' + error.message,
          variant: 'destructive',
        });
      } else {
        setTimeEntries(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  };

  const handleAddEntry = async () => {
    if (!selectedDate || !selectedUserId || !hoursWorked || !user) {
      toast({
        title: 'Missing Information',
        description: 'Please select a technician, date, and hours worked.',
        variant: 'destructive',
      });
      return;
    }

    const hours = parseFloat(hoursWorked);
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      toast({
        title: 'Invalid Hours',
        description: 'Hours must be between 0 and 24.',
        variant: 'destructive',
      });
      return;
    }

    const selectedUser = users.find(u => u.id === selectedUserId);
    const technicianName = selectedUser?.full_name || selectedUser?.email || 'Unknown';

    const { error } = await supabase
      .from('time_entries')
      .insert({
        order_id: orderId,
        user_id: selectedUserId,
        technician_name: technicianName,
        work_date: format(selectedDate, 'yyyy-MM-dd'),
        hours_worked: hours,
        notes: notes.trim() || null,
        stage_id: selectedStageId && selectedStageId !== '' ? selectedStageId : null,
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add time entry.',
        variant: 'destructive',
      });
      console.error('Error adding time entry:', error);
    } else {
      toast({
        title: 'Time Entry Added',
        description: `Added ${hours} hours for ${technicianName}.`,
      });
      setSelectedUserId('');
      setSelectedStageId('');
      setHoursWorked('');
      setNotes('');
      setIsAddingEntry(false);
      fetchTimeEntries();
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', entryId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete time entry.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Deleted',
        description: 'Time entry removed.',
      });
      fetchTimeEntries();
    }
  };

  const entriesForSelectedDate = timeEntries.filter(
    (entry) => entry.work_date === format(selectedDate || new Date(), 'yyyy-MM-dd')
  );

  const totalHoursForDate = entriesForSelectedDate.reduce(
    (sum, entry) => sum + parseFloat(entry.hours_worked.toString()),
    0
  );

  const totalHoursAllTime = timeEntries.reduce(
    (sum, entry) => sum + parseFloat(entry.hours_worked.toString()),
    0
  );

  // Get all dates that have time entries for highlighting
  const datesWithEntries = timeEntries.map(entry => new Date(entry.work_date));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Man Hours Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calendar and Controls Side-by-Side */}
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4">
          {/* Calendar on the left */}
          <div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className={cn("rounded-md border pointer-events-auto")}
              weekStartsOn={1}
              modifiers={{
                hasEntries: datesWithEntries
              }}
              modifiersClassNames={{
                hasEntries: "bg-primary/20 font-semibold"
              }}
            />
          </div>

          {/* Selected Date Info and Controls on the right */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {selectedDate ? formatDate(selectedDate, dateFormat) : 'Select a date'}
              </Label>
              
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">This Date</p>
                  <p className="text-lg font-semibold">{totalHoursForDate.toFixed(2)} hrs</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Project</p>
                  <p className="text-lg font-semibold">{totalHoursAllTime.toFixed(2)} hrs</p>
                </div>
              </div>
            </div>

            {/* Add Entry Form or Button */}
            {isAddingEntry ? (
              <div className="space-y-3 p-4 border border-border rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="technician">Technician</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a technician" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {stages.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="stage">Stage (Optional)</Label>
                    <Select value={selectedStageId} onValueChange={setSelectedStageId}>
                      <SelectTrigger>
                        <SelectValue placeholder="No Stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="hours">Hours Worked</Label>
                  <Input
                    id="hours"
                    type="number"
                    step="0.25"
                    min="0"
                    max="24"
                    placeholder="8.0"
                    value={hoursWorked}
                    onChange={(e) => setHoursWorked(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Work description..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[60px]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddEntry} size="sm" className="flex-1">
                    Save Entry
                  </Button>
                  <Button
                    onClick={() => {
                      setIsAddingEntry(false);
                      setSelectedUserId('');
                      setSelectedStageId('');
                      setHoursWorked('');
                      setNotes('');
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => setIsAddingEntry(true)} size="sm" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Time Entry
              </Button>
            )}

            {/* Entries for Selected Date */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Entries</Label>
              {entriesForSelectedDate.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {entriesForSelectedDate.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start justify-between p-3 bg-muted/50 rounded-lg border border-border/30"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{entry.technician_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {parseFloat(entry.hours_worked.toString()).toFixed(2)} hours
                        </p>
                        {entry.stage_id && (
                          <p className="text-xs text-primary mt-1">
                            {stages.find(s => s.id === entry.stage_id)?.name || 'Stage'}
                          </p>
                        )}
                        {entry.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No time entries for this date.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Entries */}
        {timeEntries.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Recent Entries</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {timeEntries.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs"
                >
                  <div>
                    <span className="font-medium">{entry.technician_name}</span>
                    <span className="text-muted-foreground mx-2">•</span>
                    <span>{formatDate(entry.work_date, dateFormat)}</span>
                  </div>
                  <span className="font-medium">{parseFloat(entry.hours_worked.toString()).toFixed(2)}h</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

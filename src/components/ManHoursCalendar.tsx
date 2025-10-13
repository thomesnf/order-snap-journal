import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface TimeEntry {
  id: string;
  work_date: string;
  hours_worked: number;
  technician_name: string;
  notes: string | null;
  order_id: string;
}

interface ManHoursCalendarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ManHoursCalendar = ({ open, onOpenChange }: ManHoursCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFormat, setDateFormat] = useState('MM/dd/yyyy');

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
    }
  }, [open]);

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
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .order('work_date', { ascending: false });

      if (error) throw error;
      setTimeEntries(data || []);
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

  const modifiers = {
    hasHours: (date: Date) => getHoursForDate(date) > 0,
  };

  const modifiersClassNames = {
    hasHours: 'bg-primary/10 font-bold',
  };

  const selectedDateEntries = getEntriesForSelectedDate();
  const selectedDateHours = selectedDateEntries.reduce((sum, entry) => sum + Number(entry.hours_worked), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Man Hours Overview</DialogTitle>
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
                />
              </Card>

              {/* Total Hours Card */}
              <Card className="p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Total Project Hours</p>
                  <p className="text-3xl font-bold text-primary">{getTotalHours().toFixed(1)}h</p>
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
                      {selectedDate ? format(selectedDate, dateFormat) : 'Select a date'}
                    </h3>
                    {selectedDateHours > 0 && (
                      <Badge className="bg-primary text-primary-foreground">
                        {selectedDateHours.toFixed(1)}h
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>

              {/* Time Entries for Selected Date */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {selectedDateEntries.length > 0 ? (
                  selectedDateEntries.map((entry) => (
                    <Card key={entry.id} className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{entry.technician_name}</p>
                          <Badge variant="outline">{Number(entry.hours_worked).toFixed(1)}h</Badge>
                        </div>
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground">{entry.notes}</p>
                        )}
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No time entries for this date</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

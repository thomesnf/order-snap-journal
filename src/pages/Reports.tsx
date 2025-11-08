import { useState, useEffect } from 'react';
import { useOrdersDB } from '@/hooks/useOrdersDB';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, FileSpreadsheet, FileText, ArrowLeft } from 'lucide-react';
import { exportOrdersToExcel, exportTimeEntriesToExcel } from '@/utils/excelExport';
import { generateInvoice } from '@/utils/invoiceGenerator';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const Reports = () => {
  const { orders } = useOrdersDB();
  const navigate = useNavigate();
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [hourlyRate, setHourlyRate] = useState<number>(() => {
    const saved = localStorage.getItem('hourlyRate');
    return saved ? parseFloat(saved) : 0;
  });

  useEffect(() => {
    fetchTimeEntries();
  }, []);

  useEffect(() => {
    localStorage.setItem('hourlyRate', hourlyRate.toString());
  }, [hourlyRate]);

  const fetchTimeEntries = async () => {
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .order('work_date', { ascending: false });

    if (error) {
      console.error('Error fetching time entries:', error);
      toast.error('Failed to fetch time entries');
      return;
    }

    setTimeEntries(data || []);
  };

  const getFilteredOrders = () => {
    let filtered = orders;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;

      switch (dateRange) {
        case 'this-month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'last-month':
          const lastMonth = subMonths(now, 1);
          startDate = startOfMonth(lastMonth);
          endDate = endOfMonth(lastMonth);
          break;
        case 'last-3-months':
          startDate = subMonths(now, 3);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate >= startDate && orderDate <= endDate;
      });
    }

    return filtered;
  };

  const getFilteredTimeEntries = () => {
    let filtered = timeEntries;

    if (dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;

      switch (dateRange) {
        case 'this-month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'last-month':
          const lastMonth = subMonths(now, 1);
          startDate = startOfMonth(lastMonth);
          endDate = endOfMonth(lastMonth);
          break;
        case 'last-3-months':
          startDate = subMonths(now, 3);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter(e => {
        const entryDate = new Date(e.work_date);
        return entryDate >= startDate && entryDate <= endDate;
      });
    }

    return filtered;
  };

  const handleExportOrders = async () => {
    const filtered = getFilteredOrders();
    await exportOrdersToExcel(filtered);
    toast.success(`Exported ${filtered.length} orders to Excel`);
  };

  const handleExportTimeEntries = async () => {
    const filtered = getFilteredTimeEntries();
    
    // Fetch order titles for each time entry
    const enrichedEntries = await Promise.all(
      filtered.map(async (entry) => {
        const { data: order } = await supabase
          .from('orders')
          .select('title')
          .eq('id', entry.order_id)
          .single();
        
        return {
          ...entry,
          order_title: order?.title || 'Unknown Order'
        };
      })
    );
    
    exportTimeEntriesToExcel(enrichedEntries);
    toast.success(`Exported ${filtered.length} time entries to Excel`);
  };

  const handleGenerateInvoice = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Fetch time entries for this order
    const { data: orderTimeEntries } = await supabase
      .from('time_entries')
      .select('*')
      .eq('order_id', orderId)
      .order('work_date', { ascending: true });

    generateInvoice({
      order,
      timeEntries: orderTimeEntries || [],
      hourlyRate: hourlyRate > 0 ? hourlyRate : undefined
    });

    toast.success('Invoice generated successfully');
  };

  const handleExportMonthlySalary = async () => {
    const filtered = getFilteredTimeEntries();
    
    // Group by technician and calculate totals
    const technicianSummary = filtered.reduce((acc: any, entry) => {
      const tech = entry.technician_name;
      if (!acc[tech]) {
        acc[tech] = {
          technician: tech,
          totalHours: 0,
          entries: []
        };
      }
      acc[tech].totalHours += entry.hours_worked;
      acc[tech].entries.push(entry);
      return acc;
    }, {});

    // Create Excel data
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = Object.values(technicianSummary).map((tech: any) => ({
      'Technician': tech.technician,
      'Total Hours': tech.totalHours.toFixed(2),
      'Hourly Rate (SEK)': hourlyRate.toFixed(2),
      'Total Salary (SEK)': (tech.totalHours * hourlyRate).toFixed(2)
    }));

    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    summaryWs['!cols'] = [
      { wch: 20 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Detail sheet
    const detailData = filtered.map(entry => ({
      'Date': format(new Date(entry.work_date), 'yyyy-MM-dd'),
      'Technician': entry.technician_name,
      'Hours': entry.hours_worked.toFixed(2),
      'Notes': entry.notes || ''
    }));

    const detailWs = XLSX.utils.json_to_sheet(detailData);
    detailWs['!cols'] = [
      { wch: 12 },
      { wch: 20 },
      { wch: 10 },
      { wch: 40 }
    ];
    XLSX.utils.book_append_sheet(wb, detailWs, 'Details');

    // Download
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    XLSX.writeFile(wb, `monthly_salary_report_${dateStr}.xlsx`);
    
    toast.success('Monthly salary report exported');
  };

  const filteredOrders = getFilteredOrders();
  const filteredTimeEntries = getFilteredTimeEntries();
  const totalHours = filteredTimeEntries.reduce((sum, e) => sum + e.hours_worked, 0);

  const statusCounts = {
    pending: filteredOrders.filter(o => o.status === 'pending').length,
    'in-progress': filteredOrders.filter(o => o.status === 'in-progress').length,
    completed: filteredOrders.filter(o => o.status === 'completed').length,
    invoiced: filteredOrders.filter(o => o.status === 'invoiced').length,
    paid: filteredOrders.filter(o => o.status === 'paid').length,
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Reports & Exports</h1>
              <p className="text-muted-foreground">Generate reports and export your data</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter data for reports and exports</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Label>Order Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="invoiced">Invoiced</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Label>Timpris (SEK)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredOrders.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statusCounts.completed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{statusCounts['in-progress']}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHours.toFixed(1)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Export Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Export Orders
              </CardTitle>
              <CardDescription>
                Export {filteredOrders.length} orders to Excel spreadsheet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleExportOrders} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export to Excel
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Export Time Entries
              </CardTitle>
              <CardDescription>
                Export {filteredTimeEntries.length} time entries ({totalHours.toFixed(1)} hours)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleExportTimeEntries} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export to Excel
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Monthly Salary Report
              </CardTitle>
              <CardDescription>
                Technician hours & earnings ({totalHours.toFixed(1)} hours total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleExportMonthlySalary} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export Salary Report
              </Button>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default Reports;
import * as XLSX from 'xlsx';
import { Order } from '@/hooks/useOrdersDB';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export const exportOrdersToExcel = async (orders: Order[], filename: string = 'orders') => {
  // Fetch time entries to calculate total hours for each order
  const { data: timeEntries } = await supabase
    .from('time_entries')
    .select('order_id, hours_worked');
  
  // Create a map of order_id to total hours
  const hoursMap = new Map<string, number>();
  (timeEntries || []).forEach(entry => {
    const current = hoursMap.get(entry.order_id) || 0;
    hoursMap.set(entry.order_id, current + Number(entry.hours_worked));
  });

  // Prepare data for Excel
  const data = orders.map(order => ({
    'Order ID': order.id.substring(0, 8),
    'Title': order.title,
    'Customer': order.customer || '-',
    'Customer Ref': order.customer_ref || '-',
    'Address': order.location || '-',
    'Status': order.status,
    'Priority': order.priority,
    'Total Man Hours': (hoursMap.get(order.id) || 0).toFixed(1),
    'Due Date': order.due_date ? format(new Date(order.due_date), 'MM/dd/yyyy') : '-',
    'Created': format(new Date(order.created_at), 'MM/dd/yyyy'),
    'Description': order.description || '-'
  }));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  const colWidths = [
    { wch: 10 }, // Order ID
    { wch: 30 }, // Title
    { wch: 20 }, // Customer
    { wch: 15 }, // Customer Ref
    { wch: 20 }, // Address
    { wch: 12 }, // Status
    { wch: 10 }, // Priority
    { wch: 15 }, // Total Man Hours
    { wch: 12 }, // Due Date
    { wch: 12 }, // Created
    { wch: 40 }, // Description
  ];
  worksheet['!cols'] = colWidths;

  // Create workbook and add worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

  // Generate file and trigger download
  XLSX.writeFile(workbook, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};

export const exportTimeEntriesToExcel = (timeEntries: any[], filename: string = 'time_entries') => {
  const data = timeEntries.map(entry => ({
    'Order': entry.order_title || '-',
    'Date': format(new Date(entry.work_date), 'MM/dd/yyyy'),
    'Technician': entry.technician_name,
    'Hours': entry.hours_worked,
    'Notes': entry.notes || '-'
  }));

  // Calculate total hours
  const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours_worked, 0);

  // Calculate hours by technician
  const hoursByTechnician = timeEntries.reduce((acc, entry) => {
    const tech = entry.technician_name;
    acc[tech] = (acc[tech] || 0) + entry.hours_worked;
    return acc;
  }, {} as Record<string, number>);

  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Enable auto-filter on the header row
  worksheet['!autofilter'] = { ref: XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: data.length, c: 4 }
  })};

  // Add summary section after the data
  const summaryStartRow = data.length + 3;
  
  // Add total hours
  XLSX.utils.sheet_add_aoa(worksheet, [
    ['SUMMARY'],
    [],
    ['Total Hours:', totalHours.toFixed(2)],
    [],
    ['Hours by Technician:']
  ], { origin: { r: summaryStartRow, c: 0 } });

  // Add technician totals
  let currentRow = summaryStartRow + 5;
  Object.entries(hoursByTechnician)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([tech, hours]) => {
      XLSX.utils.sheet_add_aoa(worksheet, [[tech, (hours as number).toFixed(2)]], { 
        origin: { r: currentRow++, c: 0 } 
      });
    });

  const colWidths = [
    { wch: 30 }, // Order
    { wch: 12 }, // Date
    { wch: 20 }, // Technician
    { wch: 10 }, // Hours
    { wch: 40 }  // Notes
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Time Entries');
  
  XLSX.writeFile(workbook, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};
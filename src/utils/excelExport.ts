import * as XLSX from 'xlsx';
import { Order } from '@/hooks/useOrdersDB';
import { format } from 'date-fns';

export const exportOrdersToExcel = (orders: Order[], filename: string = 'orders') => {
  // Prepare data for Excel
  const data = orders.map(order => ({
    'Order ID': order.id.substring(0, 8),
    'Title': order.title,
    'Customer': order.customer || '-',
    'Customer Ref': order.customer_ref || '-',
    'Location': order.location || '-',
    'Status': order.status,
    'Priority': order.priority,
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
    { wch: 20 }, // Location
    { wch: 12 }, // Status
    { wch: 10 }, // Priority
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

  const worksheet = XLSX.utils.json_to_sheet(data);
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
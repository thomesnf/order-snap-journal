import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order } from '@/hooks/useOrdersDB';
import { format } from 'date-fns';

interface InvoiceData {
  order: Order;
  timeEntries?: any[];
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  hourlyRate?: number;
}

export const generateInvoice = ({
  order,
  timeEntries = [],
  companyName = 'Your Company Name',
  companyAddress = 'Company Address',
  companyPhone = 'Phone Number',
  companyEmail = 'email@company.com',
  hourlyRate = 0
}: InvoiceData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('FAKTURA', pageWidth / 2, 20, { align: 'center' });
  
  // Company info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(companyName, 20, 35);
  doc.text(companyAddress, 20, 40);
  doc.text(companyPhone, 20, 45);
  doc.text(companyEmail, 20, 50);
  
  // Invoice details
  doc.setFont('helvetica', 'bold');
  doc.text('Fakturadetaljer', 20, 65);
  doc.setFont('helvetica', 'normal');
  doc.text(`Order-ID: ${order.id.substring(0, 8)}`, 20, 72);
  doc.text(`Datum: ${format(new Date(), 'yyyy-MM-dd')}`, 20, 77);
  doc.text(`Ordertitel: ${order.title}`, 20, 82);
  
  // Customer info
  doc.setFont('helvetica', 'bold');
  doc.text('Fakturera till:', 120, 65);
  doc.setFont('helvetica', 'normal');
  doc.text(order.customer || 'Kundnamn', 120, 72);
  if (order.customer_ref) {
    doc.text(`Ref: ${order.customer_ref}`, 120, 77);
  }
  if (order.location) {
    doc.text(order.location, 120, 82);
  }
  
  // Time entries table
  if (timeEntries.length > 0) {
    const tableData = timeEntries.map(entry => [
      format(new Date(entry.work_date), 'yyyy-MM-dd'),
      entry.technician_name,
      entry.hours_worked.toString(),
      hourlyRate > 0 ? `${hourlyRate.toFixed(2)} kr` : '-',
      hourlyRate > 0 ? `${(entry.hours_worked * hourlyRate).toFixed(2)} kr` : '-',
      entry.notes || '-'
    ]);
    
    autoTable(doc, {
      startY: 95,
      head: [['Datum', 'Tekniker', 'Timmar', 'Timpris', 'Belopp', 'Anteckningar']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66] }
    });
    
    // Total
    if (hourlyRate > 0) {
      const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours_worked, 0);
      const totalAmount = totalHours * hourlyRate;
      
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont('helvetica', 'bold');
      doc.text(`Totalt antal timmar: ${totalHours.toFixed(2)}`, pageWidth - 70, finalY);
      doc.text(`Totalt belopp: ${totalAmount.toFixed(2)} kr`, pageWidth - 70, finalY + 7);
    }
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Tack för din beställning!', pageWidth / 2, pageHeight - 20, { align: 'center' });
  
  // Save the PDF
  doc.save(`invoice_${order.id.substring(0, 8)}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
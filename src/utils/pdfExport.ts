import { JournalEntry, Order } from '@/hooks/useOrdersDB';

export const exportJournalEntryToPDF = async (entry: JournalEntry, orderTitle: string) => {
  // Simple implementation - creates a printable HTML page
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const date = new Date(entry.created_at).toLocaleString();
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Journal Entry - ${orderTitle}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          h1 {
            color: #2563eb;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
          }
          .meta {
            color: #666;
            font-size: 14px;
            margin: 20px 0;
          }
          .content {
            line-height: 1.6;
            margin: 20px 0;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <h1>${orderTitle}</h1>
        <div class="meta">
          <strong>Date:</strong> ${date}<br>
          <strong>Entry ID:</strong> ${entry.id}
        </div>
        <div class="content">
          ${entry.content.replace(/\n/g, '<br>')}
        </div>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

export const exportMultipleEntriesToPDF = async (entries: JournalEntry[], orderTitle: string, order: Order) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  // Calculate total man hours from time_entries
  const totalHours = order.time_entries?.reduce((sum, entry) => sum + Number(entry.hours_worked || 0), 0) || 0;

  const orderDetailsHTML = `
    <div class="order-details">
      <h2>Order Details</h2>
      <div class="detail-grid">
        <div><strong>Status:</strong> ${order.status}</div>
        <div><strong>Priority:</strong> ${order.priority}</div>
        ${order.customer ? `<div><strong>Customer:</strong> ${order.customer}</div>` : ''}
        ${order.customer_ref ? `<div><strong>Customer Ref:</strong> ${order.customer_ref}</div>` : ''}
        ${order.location ? `<div><strong>Location:</strong> ${order.location}</div>` : ''}
        ${order.due_date ? `<div><strong>Due Date:</strong> ${new Date(order.due_date).toLocaleDateString()}</div>` : ''}
        ${order.description ? `<div class="description"><strong>Description:</strong> ${order.description}</div>` : ''}
      </div>
      <div class="man-hours">
        <strong>Total Man Hours:</strong> ${totalHours.toFixed(2)} hours
      </div>
    </div>
  `;

  const entriesHTML = entries.map(entry => {
    const date = new Date(entry.created_at).toLocaleString();
    return `
      <div class="entry">
        <div class="entry-header">
          <strong>Entry Date:</strong> ${date}
        </div>
        <div class="entry-content">
          ${entry.content.replace(/\n/g, '<br>')}
        </div>
      </div>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Journal Entries - ${orderTitle}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          h1 {
            color: #2563eb;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
          }
          h2 {
            color: #333;
            margin-top: 20px;
            margin-bottom: 10px;
          }
          .order-details {
            margin: 20px 0;
            padding: 15px;
            background: #f9fafb;
            border-radius: 8px;
          }
          .detail-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin: 10px 0;
          }
          .detail-grid > div {
            padding: 5px 0;
          }
          .description {
            grid-column: 1 / -1;
          }
          .man-hours {
            margin-top: 15px;
            padding: 10px;
            background: #fff;
            border-left: 4px solid #2563eb;
            font-size: 16px;
          }
          .entry {
            margin: 30px 0;
            padding: 15px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
          }
          .entry-header {
            color: #666;
            font-size: 14px;
            margin-bottom: 10px;
          }
          .entry-content {
            line-height: 1.6;
          }
          @media print {
            body {
              padding: 0;
            }
            .entry {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <h1>${orderTitle} - All Journal Entries</h1>
        ${orderDetailsHTML}
        <h2>Journal Entries</h2>
        ${entriesHTML}
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

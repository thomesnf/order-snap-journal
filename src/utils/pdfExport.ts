import { JournalEntry, Order, Photo, SummaryEntry } from '@/hooks/useOrdersDB';

interface PDFTranslations {
  orderDetails: string;
  summary: string;
  summaryEntries: string;
  status: string;
  priority: string;
  customer: string;
  customerRef: string;
  location: string;
  dueDate: string;
  description: string;
  totalManHours: string;
  hours: string;
  journalEntries: string;
  entryDate: string;
  date: string;
  entryId: string;
  allJournalEntries: string;
}

const translations: Record<'en' | 'sv', PDFTranslations> = {
  en: {
    orderDetails: 'Order Details',
    summary: 'Summary',
    summaryEntries: 'Summary Entries',
    status: 'Status',
    priority: 'Priority',
    customer: 'Customer',
    customerRef: 'Customer Ref',
    location: 'Location',
    dueDate: 'Due Date',
    description: 'Description',
    totalManHours: 'Total Man Hours',
    hours: 'hours',
    journalEntries: 'Journal Entries',
    entryDate: 'Entry Date',
    date: 'Date',
    entryId: 'Entry ID',
    allJournalEntries: 'All Journal Entries'
  },
  sv: {
    orderDetails: 'Orderdetaljer',
    summary: 'Sammanfattning',
    summaryEntries: 'Sammanfattningsanteckningar',
    status: 'Status',
    priority: 'Prioritet',
    customer: 'Kund',
    customerRef: 'Kundreferens',
    location: 'Plats',
    dueDate: 'Förfallodatum',
    description: 'Beskrivning',
    totalManHours: 'Totala Arbetstimmar',
    hours: 'timmar',
    journalEntries: 'Journalanteckningar',
    entryDate: 'Anteckningsdatum',
    date: 'Datum',
    entryId: 'Antecknings-ID',
    allJournalEntries: 'Alla Journalanteckningar'
  }
};

export const exportJournalEntryToPDF = async (entry: JournalEntry, orderTitle: string, language: 'en' | 'sv' = 'en', logoUrl?: string, photos?: Photo[]) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const t = translations[language];
  const date = new Date(entry.created_at).toLocaleDateString();
  
  const logoHTML = logoUrl ? `<div style="text-align: left; margin-top: 15px; margin-bottom: 20px;"><img src="${logoUrl}" alt="Company Logo" style="max-height: 80px; max-width: 200px;" /></div>` : '';
  
  const photosHTML = photos && photos.length > 0 ? `
    <div class="photos">
      <h3>Photos</h3>
      <div class="photo-grid">
        ${photos.map(photo => `
          <div class="photo-item">
            <img src="${photo.url}" alt="${photo.caption || 'Journal photo'}" />
            ${photo.caption ? `<p class="photo-caption">${photo.caption}</p>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';
  
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
          .photos {
            margin: 20px 0;
          }
          .photos h3 {
            color: #333;
            margin-bottom: 15px;
          }
          .photo-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 20px;
          }
          .photo-item img {
            width: 100%;
            height: 200px;
            object-fit: cover;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }
          .photo-caption {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
          }
          @media print {
            body {
              padding: 0;
            }
            .photo-grid {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <h1>${orderTitle}</h1>
        ${logoHTML}
        <div class="meta">
          <strong>${t.date}:</strong> ${date}<br>
          <strong>${t.entryId}:</strong> ${entry.id}
        </div>
        <div class="content">
          ${entry.content.replace(/\n/g, '<br>')}
        </div>
        ${photosHTML}
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

export const exportMultipleEntriesToPDF = async (entries: JournalEntry[], orderTitle: string, order: Order, language: 'en' | 'sv' = 'en', logoUrl?: string, entryPhotos?: Record<string, Photo[]>, summaryEntries?: SummaryEntry[]) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const t = translations[language];
  
  // Calculate total man hours from time_entries
  const totalHours = order.time_entries?.reduce((sum, entry) => sum + Number(entry.hours_worked || 0), 0) || 0;

  // Group hours by day
  const hoursByDay = order.time_entries?.reduce((acc, entry) => {
    const date = new Date(entry.work_date).toLocaleDateString();
    acc[date] = (acc[date] || 0) + Number(entry.hours_worked || 0);
    return acc;
  }, {} as Record<string, number>) || {};

  const hoursByDayHTML = Object.keys(hoursByDay).length > 0 ? `
    <div class="hours-by-day">
      ${Object.entries(hoursByDay)
        .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
        .map(([date, hours]) => `<div>${date}: ${hours.toFixed(2)} ${t.hours}</div>`)
        .join('')}
    </div>
  ` : '';

  const logoHTML = logoUrl ? `<div style="text-align: left; margin-top: 15px; margin-bottom: 20px;"><img src="${logoUrl}" alt="Company Logo" style="max-height: 80px; max-width: 200px;" /></div>` : '';

  const summaryHTML = order.summary ? `
    <div class="order-summary">
      <h2>${t.summary}</h2>
      <p>${order.summary.replace(/\n/g, '<br>')}</p>
    </div>
  ` : '';

  const summaryEntriesHTML = summaryEntries && summaryEntries.length > 0 ? `
    <div class="summary-entries-section">
      <h2>${t.summaryEntries}</h2>
      ${summaryEntries.map(entry => {
        const date = new Date(entry.created_at).toLocaleDateString();
        return `
          <div class="summary-entry">
            <div class="entry-header">
              <strong>${t.entryDate}:</strong> ${date}
            </div>
            <div class="entry-content">
              ${entry.content.replace(/\n/g, '<br>')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  ` : '';

  const orderDetailsHTML = `
    <div class="order-details">
      <h2>${t.orderDetails}</h2>
      <div class="detail-grid">
        <div><strong>${t.status}:</strong> ${order.status}</div>
        <div><strong>${t.priority}:</strong> ${order.priority}</div>
        ${order.customer ? `<div><strong>${t.customer}:</strong> ${order.customer}</div>` : ''}
        ${order.customer_ref ? `<div><strong>${t.customerRef}:</strong> ${order.customer_ref}</div>` : ''}
        ${order.location ? `<div><strong>${t.location}:</strong> ${order.location}</div>` : ''}
        ${order.due_date ? `<div><strong>${t.dueDate}:</strong> ${new Date(order.due_date).toLocaleDateString()}</div>` : ''}
        ${order.description ? `<div class="description"><strong>${t.description}:</strong> ${order.description}</div>` : ''}
      </div>
      <div class="man-hours">
        <strong>${t.totalManHours}:</strong> ${totalHours.toFixed(2)} ${t.hours}
        ${hoursByDayHTML}
      </div>
    </div>
  `;

  const entriesHTML = entries.map(entry => {
    const date = new Date(entry.created_at).toLocaleDateString();
    const photos = entryPhotos?.[entry.id] || [];
    const photosHTML = photos.length > 0 ? `
      <div class="entry-photos">
        ${photos.map(photo => `
          <div class="photo-item">
            <img src="${photo.url}" alt="${photo.caption || 'Journal photo'}" />
            ${photo.caption ? `<p class="photo-caption">${photo.caption}</p>` : ''}
          </div>
        `).join('')}
      </div>
    ` : '';
    
    return `
      <div class="entry">
        <div class="entry-header">
          <strong>${t.entryDate}:</strong> ${date}
        </div>
        <div class="entry-content">
          ${entry.content.replace(/\n/g, '<br>')}
        </div>
        ${photosHTML}
      </div>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${t.journalEntries} - ${orderTitle}</title>
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
          .order-summary {
            margin: 20px 0;
            padding: 15px;
            background: #f0f9ff;
            border-left: 4px solid #2563eb;
            border-radius: 4px;
          }
          .order-summary p {
            margin: 10px 0 0 0;
            line-height: 1.6;
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
          .hours-by-day {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #666;
          }
          .hours-by-day > div {
            padding: 3px 0;
          }
          .summary-entries-section {
            margin: 20px 0;
          }
          .summary-entry {
            margin: 15px 0;
            padding: 15px;
            background: #f0f9ff;
            border-left: 4px solid #2563eb;
            border-radius: 4px;
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
          .entry-photos {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-top: 15px;
          }
          .photo-item img {
            width: 100%;
            height: 200px;
            object-fit: cover;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }
          .photo-caption {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
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
        <h1>${orderTitle} - ${t.allJournalEntries}</h1>
        ${logoHTML}
        ${orderDetailsHTML}
        ${summaryHTML}
        ${summaryEntriesHTML}
        <h2>${t.journalEntries}</h2>
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

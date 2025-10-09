import { JournalEntry, Order, Photo, SummaryEntry } from '@/hooks/useOrdersDB';
import { formatDate, DateFormatType } from './dateFormat';

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

interface PDFFieldConfig {
  field: string;
  label: string;
  visible: boolean;
  order: number;
  type?: 'field' | 'page_break';
}

interface PDFLayoutSettings {
  primaryColor?: string;
  fontFamily?: string;
  showLogo?: boolean;
  logoMaxHeight?: number;
  pageMargin?: number;
  titleFontSize?: number;
  fieldConfig?: PDFFieldConfig[];
}

export const exportJournalEntryToPDF = async (
  entry: JournalEntry, 
  orderTitle: string, 
  language: 'en' | 'sv' = 'en', 
  logoUrl?: string, 
  photos?: Photo[], 
  dateFormat: DateFormatType = 'MM/DD/YYYY',
  layoutSettings?: PDFLayoutSettings
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const t = translations[language];
  const date = formatDate(entry.created_at, dateFormat);
  
  const settings = {
    primaryColor: layoutSettings?.primaryColor || '#2563eb',
    fontFamily: layoutSettings?.fontFamily || 'Arial, sans-serif',
    showLogo: layoutSettings?.showLogo !== false,
    logoMaxHeight: layoutSettings?.logoMaxHeight || 80,
    pageMargin: layoutSettings?.pageMargin || 20,
  };
  
  const logoHTML = (logoUrl && settings.showLogo) ? `<div style="text-align: left; margin-top: 15px; margin-bottom: 20px;"><img src="${logoUrl}" alt="Company Logo" style="max-height: ${settings.logoMaxHeight}px; max-width: 200px;" /></div>` : '';
  
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
            font-family: ${settings.fontFamily};
            padding: ${settings.pageMargin}px;
            max-width: 800px;
            margin: 0 auto;
          }
          h1 {
            color: ${settings.primaryColor};
            border-bottom: 2px solid ${settings.primaryColor};
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

export const exportMultipleEntriesToPDF = async (
  entries: JournalEntry[], 
  orderTitle: string, 
  order: Order, 
  language: 'en' | 'sv' = 'en', 
  logoUrl?: string, 
  entryPhotos?: Record<string, Photo[]>, 
  summaryEntries?: SummaryEntry[], 
  dateFormat: DateFormatType = 'MM/DD/YYYY',
  layoutSettings?: PDFLayoutSettings
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const t = translations[language];
  
  const settings = {
    primaryColor: layoutSettings?.primaryColor || '#2563eb',
    fontFamily: layoutSettings?.fontFamily || 'Arial, sans-serif',
    showLogo: layoutSettings?.showLogo !== false,
    logoMaxHeight: layoutSettings?.logoMaxHeight || 80,
    pageMargin: layoutSettings?.pageMargin || 20,
  };
  
  // Calculate total man hours from time_entries
  const totalHours = order.time_entries?.reduce((sum, entry) => sum + Number(entry.hours_worked || 0), 0) || 0;

  // Group hours by day
  const hoursByDay = order.time_entries?.reduce((acc, entry) => {
    const date = formatDate(entry.work_date, dateFormat);
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

  const logoHTML = (logoUrl && settings.showLogo) ? `<div style="text-align: left; margin-top: 15px; margin-bottom: 20px;"><img src="${logoUrl}" alt="Company Logo" style="max-height: ${settings.logoMaxHeight}px; max-width: 200px;" /></div>` : '';


  // Get field configuration or use defaults
  const fieldConfig = layoutSettings?.fieldConfig || [
    { field: 'title', label: 'Title', visible: true, order: 1 },
    { field: 'logo', label: 'Logo', visible: true, order: 2 },
    { field: 'status', label: t.status, visible: true, order: 3 },
    { field: 'priority', label: t.priority, visible: true, order: 4 },
    { field: 'customer', label: t.customer, visible: true, order: 5 },
    { field: 'customer_ref', label: t.customerRef, visible: true, order: 6 },
    { field: 'location', label: t.location, visible: true, order: 7 },
    { field: 'due_date', label: t.dueDate, visible: true, order: 8 },
    { field: 'description', label: t.description, visible: true, order: 9 },
    { field: 'summary', label: t.summary, visible: true, order: 10 },
    { field: 'summary_entries', label: t.summaryEntries, visible: true, order: 11 },
    { field: 'man_hours', label: t.totalManHours, visible: true, order: 12 },
    { field: 'hours_by_day', label: 'Hours by Day', visible: true, order: 13 },
    { field: 'journal_entries', label: t.journalEntries, visible: true, order: 14 },
  ];

  const isFieldVisible = (fieldName: string) => {
    const config = fieldConfig.find(f => f.field === fieldName);
    return config ? config.visible : true;
  };

  const titleFontSize = layoutSettings?.titleFontSize || 24;

  const summaryEntriesHTML = summaryEntries && summaryEntries.length > 0 && isFieldVisible('summary_entries') ? `
    <div class="summary-entries-section">
      <h2>${t.summaryEntries}</h2>
      ${summaryEntries.map(entry => {
        return `
          <div class="summary-entry">
            <div class="entry-content">
              ${entry.content.replace(/\n/g, '<br>')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  ` : '';

  const summaryHTML = order.summary && isFieldVisible('summary') ? `
    <div class="order-summary">
      <h2>${t.summary}</h2>
      <p>${order.summary.replace(/\n/g, '<br>')}</p>
    </div>
  ` : '';

  // Build individual field sections
  const statusHTML = order.status && isFieldVisible('status') ? `
    <div class="field-section">
      <strong>${t.status}:</strong> ${order.status}
    </div>
  ` : '';

  const priorityHTML = order.priority && isFieldVisible('priority') ? `
    <div class="field-section">
      <strong>${t.priority}:</strong> ${order.priority}
    </div>
  ` : '';

  const customerHTML = order.customer && isFieldVisible('customer') ? `
    <div class="field-section">
      <strong>${t.customer}:</strong> ${order.customer}
    </div>
  ` : '';

  const customerRefHTML = order.customer_ref && isFieldVisible('customer_ref') ? `
    <div class="field-section">
      <strong>${t.customerRef}:</strong> ${order.customer_ref}
    </div>
  ` : '';

  const locationHTML = order.location && isFieldVisible('location') ? `
    <div class="field-section">
      <strong>${t.location}:</strong> ${order.location}
    </div>
  ` : '';

  const dueDateHTML = order.due_date && isFieldVisible('due_date') ? `
    <div class="field-section">
      <strong>${t.dueDate}:</strong> ${formatDate(order.due_date, dateFormat)}
    </div>
  ` : '';

  const descriptionHTML = order.description && isFieldVisible('description') ? `
    <div class="field-section">
      <strong>${t.description}:</strong> ${order.description}
    </div>
  ` : '';

  const manHoursHTML = isFieldVisible('man_hours') ? `
    <div class="man-hours">
      <strong>${t.totalManHours}:</strong> ${totalHours.toFixed(2)} ${t.hours}
    </div>
  ` : '';

  const hoursByDayHTML_Section = isFieldVisible('hours_by_day') && Object.keys(hoursByDay).length > 0 ? `
    <div class="hours-by-day-section">
      <strong>Hours by Day:</strong>
      <div class="hours-by-day">
        ${Object.entries(hoursByDay)
          .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
          .map(([date, hours]) => `<div>${date}: ${hours.toFixed(2)} ${t.hours}</div>`)
          .join('')}
      </div>
    </div>
  ` : '';

  const entriesHTML = entries.map(entry => {
    const date = formatDate(entry.created_at, dateFormat);
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

  // Build content sections based on field configuration order
  const contentSections: Record<string, string> = {
    title: isFieldVisible('title') ? `<h1>${orderTitle} - ${t.allJournalEntries}</h1>` : '',
    logo: (logoUrl && settings.showLogo && isFieldVisible('logo')) ? logoHTML : '',
    status: statusHTML,
    priority: priorityHTML,
    customer: customerHTML,
    customer_ref: customerRefHTML,
    location: locationHTML,
    due_date: dueDateHTML,
    description: descriptionHTML,
    summary: summaryHTML,
    summary_entries: summaryEntriesHTML,
    man_hours: manHoursHTML,
    hours_by_day: hoursByDayHTML_Section,
    journal_entries: isFieldVisible('journal_entries') ? `
      <div class="journal-entries-section">
        <h2>${t.journalEntries}</h2>
        ${entriesHTML}
      </div>
    ` : '',
  };

  // Build body content based on field configuration
  let bodyContent = '';
  
  for (const fieldConfigItem of fieldConfig) {
    if (fieldConfigItem.type === 'page_break' && fieldConfigItem.visible) {
      bodyContent += '<div class="page-break"></div>';
    } else if (contentSections[fieldConfigItem.field]) {
      bodyContent += contentSections[fieldConfigItem.field];
    }
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${t.journalEntries} - ${orderTitle}</title>
        <style>
          body {
            font-family: ${settings.fontFamily};
            padding: ${settings.pageMargin}px;
            max-width: 800px;
            margin: 0 auto;
          }
          h1 {
            color: ${settings.primaryColor};
            border-bottom: 2px solid ${settings.primaryColor};
            padding-bottom: 10px;
            font-size: ${titleFontSize}px;
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
            border-left: 4px solid ${settings.primaryColor};
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
            border-left: 4px solid ${settings.primaryColor};
            font-size: 16px;
          }
          .hours-by-day-section {
            margin-top: 15px;
            padding: 10px;
            background: #f9fafb;
            border-radius: 4px;
          }
          .hours-by-day {
            margin-top: 10px;
            padding-top: 10px;
            font-size: 14px;
            color: #666;
          }
          .hours-by-day > div {
            padding: 3px 0;
          }
          .field-section {
            margin: 10px 0;
            padding: 10px;
            background: #f9fafb;
            border-radius: 4px;
          }
          .summary-entries-section {
            margin: 20px 0;
          }
          .summary-entry {
            margin: 15px 0;
            padding: 15px;
            background: #f0f9ff;
            border-left: 4px solid ${settings.primaryColor};
            border-radius: 4px;
          }
          .journal-entries-section {
            margin-top: 30px;
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
          .page-break {
            page-break-before: always;
            break-before: page;
            display: block;
            height: 0;
            margin: 0;
            padding: 0;
          }
          @media print {
            body {
              padding: 0;
            }
            .entry {
              page-break-inside: avoid;
            }
            .page-break {
              page-break-before: always;
              break-before: page;
            }
          }
        </style>
      </head>
      <body>
        ${bodyContent || `
          <h1>${orderTitle} - ${t.allJournalEntries}</h1>
          ${logoHTML}
          ${statusHTML}
          ${priorityHTML}
          ${customerHTML}
          ${customerRefHTML}
          ${locationHTML}
          ${dueDateHTML}
          ${descriptionHTML}
          ${manHoursHTML}
          ${hoursByDayHTML_Section}
          ${summaryHTML}
          ${summaryEntriesHTML}
          <div class="journal-entries-section">
            <h2>${t.journalEntries}</h2>
            ${entriesHTML}
          </div>
        `}
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

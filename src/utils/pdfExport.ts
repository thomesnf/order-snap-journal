import { JournalEntry, Order, Photo, SummaryEntry } from '@/hooks/useOrdersDB';
import { formatDate, DateFormatType } from './dateFormat';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  hoursByDay: string;
  journalEntries: string;
  entryDate: string;
  date: string;
  entryId: string;
  allJournalEntries: string;
  photos: string;
  // Status values
  pending: string;
  in_progress: string;
  completed: string;
  invoiced: string;
  paid: string;
  cancelled: string;
  // Priority values
  low: string;
  medium: string;
  high: string;
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
    location: 'Address',
    dueDate: 'Due Date',
    description: 'Description',
    totalManHours: 'Total Man Hours',
    hours: 'hours',
    hoursByDay: 'Hours by Day',
    journalEntries: 'Journal Entries',
    entryDate: 'Entry Date',
    date: 'Date',
    entryId: 'Entry ID',
    allJournalEntries: 'All Journal Entries',
    photos: 'Photos',
    // Status values
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    invoiced: 'Invoiced',
    paid: 'Paid',
    cancelled: 'Cancelled',
    // Priority values
    low: 'Low',
    medium: 'Medium',
    high: 'High'
  },
  sv: {
    orderDetails: 'Orderdetaljer',
    summary: 'Sammanfattning',
    summaryEntries: 'Sammanfattningsanteckningar',
    status: 'Status',
    priority: 'Prioritet',
    customer: 'Kund',
    customerRef: 'Kundreferens',
    location: 'Adress',
    dueDate: 'Förfallodatum',
    description: 'Beskrivning',
    totalManHours: 'Totala Arbetstimmar',
    hours: 'timmar',
    hoursByDay: 'Timmar per dag',
    journalEntries: 'Journalanteckningar',
    entryDate: 'Anteckningsdatum',
    date: 'Datum',
    entryId: 'Antecknings-ID',
    allJournalEntries: 'Alla Journalanteckningar',
    photos: 'Foton',
    // Status values
    pending: 'Väntande',
    in_progress: 'Pågående',
    completed: 'Slutförd',
    invoiced: 'Fakturerad',
    paid: 'Betald',
    cancelled: 'Avbruten',
    // Priority values
    low: 'Låg',
    medium: 'Medel',
    high: 'Hög'
  }
};

interface PDFFieldConfig {
  field: string;
  label: string;
  visible: boolean;
  order: number;
  type?: 'field' | 'page_break' | 'line_break' | 'horizontal_line';
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
  
  const logoHTML = (logoUrl && settings.showLogo) ? `<div style="text-align: left; margin-top: 15px; margin-bottom: 20px;"><img src="${logoUrl}" alt="Company Logo" style="max-height: ${settings.logoMaxHeight}px; max-width: 200px;" loading="lazy" /></div>` : '';
  
  const photosHTML = photos && photos.length > 0 ? `
    <div class="photos">
      <h3>${t.photos}</h3>
      <div class="photo-grid">
        ${photos.map(photo => `
          <div class="photo-item">
            <img src="${photo.url}" alt="${photo.caption || 'Journal photo'}" loading="lazy" />
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
          .photo-item {
            page-break-inside: avoid;
          }
          .photo-item img {
            width: 100%;
            height: auto;
            object-fit: contain;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }
          .photo-caption {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
          }
          /* Ensure text is selectable in PDF */
          * {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
          }
          @media print {
            @page {
              margin: ${settings.pageMargin}mm;
            }
            body {
              padding: 0;
              margin: 0;
            }
            .photo-item {
              page-break-inside: avoid;
            }
            * {
              -webkit-user-select: text !important;
              user-select: text !important;
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
          // Wait for images to load before printing
          Promise.all(Array.from(document.images).filter(img => !img.complete).map(img => 
            new Promise(resolve => { img.onload = img.onerror = resolve; })
          )).then(() => {
            // Use requestAnimationFrame for smoother rendering
            requestAnimationFrame(() => {
              window.print();
            });
          });
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

  // Get unique technicians
  const uniqueTechnicians = new Set(order.time_entries?.map(e => e.technician_name) || []);
  const technicianCount = uniqueTechnicians.size;

  // Group hours by day
  const hoursByDay = order.time_entries?.reduce((acc, entry) => {
    const date = formatDate(entry.work_date, dateFormat);
    acc[date] = (acc[date] || 0) + Number(entry.hours_worked || 0);
    return acc;
  }, {} as Record<string, number>) || {};

  // Group time entries by stage
  const entriesByStage: Record<string, any[]> = {};
  const noStageEntries: any[] = [];
  
  order.time_entries?.forEach(entry => {
    if (entry.stage_name) {
      if (!entriesByStage[entry.stage_name]) {
        entriesByStage[entry.stage_name] = [];
      }
      entriesByStage[entry.stage_name].push(entry);
    } else {
      noStageEntries.push(entry);
    }
  });

  const hoursByDayHTML = Object.keys(hoursByDay).length > 0 ? `
    <div class="hours-by-day">
      ${Object.entries(hoursByDay)
        .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
        .map(([date, hours]) => `<div>${date}: ${hours.toFixed(2)} ${t.hours}</div>`)
        .join('')}
    </div>
  ` : '';

  const logoHTML = (logoUrl && settings.showLogo) ? `<div style="text-align: left; margin-top: 15px; margin-bottom: 20px;"><img src="${logoUrl}" alt="Company Logo" style="max-height: ${settings.logoMaxHeight}px; max-width: 200px;" loading="lazy" /></div>` : '';


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
    { field: 'hours_by_day', label: t.hoursByDay, visible: true, order: 13 },
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

  // Build order details section with 2-column grid
  const orderDetailsFields = [
    { field: 'status', label: t.status, value: order.status ? t[order.status as keyof PDFTranslations] || order.status : null },
    { field: 'priority', label: t.priority, value: order.priority ? t[order.priority as keyof PDFTranslations] || order.priority : null },
    { field: 'customer', label: t.customer, value: order.customer },
    { field: 'customer_ref', label: t.customerRef, value: order.customer_ref },
    { field: 'location', label: t.location, value: order.location },
    { field: 'due_date', label: t.dueDate, value: order.due_date ? formatDate(order.due_date, dateFormat) : null },
  ];

  const visibleDetailsFields = orderDetailsFields.filter(f => 
    isFieldVisible(f.field) && f.value
  );

  const orderDetailsHTML = visibleDetailsFields.length > 0 ? `
    <div class="order-details">
      <h2>${t.orderDetails}</h2>
      <div class="detail-grid">
        ${visibleDetailsFields.map(f => `
          <div class="field-item">
            <strong>${f.label}:</strong> ${f.value}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const descriptionHTML = order.description && isFieldVisible('description') ? `
    <div class="field-section">
      <strong>${t.description}:</strong> ${order.description}
    </div>
  ` : '';

  const manHoursHTML = isFieldVisible('man_hours') ? `
    <div class="man-hours">
      <strong>${t.totalManHours}:</strong> ${totalHours.toFixed(2)} ${t.hours} (${technicianCount} technician${technicianCount !== 1 ? 's' : ''})
      ${Object.keys(entriesByStage).length > 0 || noStageEntries.length > 0 ? `
        <div class="hours-by-stage">
          ${Object.entries(entriesByStage).map(([stageName, entries]) => {
            const stageHours = entries.reduce((sum, e) => sum + Number(e.hours_worked || 0), 0);
            const stageTechs = new Set(entries.map(e => e.technician_name)).size;
            return `<div class="stage-item">• ${stageName}: ${stageHours.toFixed(2)} ${t.hours} (${stageTechs} tech${stageTechs !== 1 ? 's' : ''})</div>`;
          }).join('')}
          ${noStageEntries.length > 0 ? (() => {
            const noStageHours = noStageEntries.reduce((sum, e) => sum + Number(e.hours_worked || 0), 0);
            const noStageTechs = new Set(noStageEntries.map(e => e.technician_name)).size;
            return `<div class="stage-item">• No Stage: ${noStageHours.toFixed(2)} ${t.hours} (${noStageTechs} tech${noStageTechs !== 1 ? 's' : ''})</div>`;
          })() : ''}
        </div>
      ` : ''}
    </div>
  ` : '';

  const hoursByDayHTML_Section = isFieldVisible('hours_by_day') && Object.keys(hoursByDay).length > 0 ? `
    <div class="hours-by-day-section">
      <strong>${t.hoursByDay}:</strong>
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
            <img src="${photo.url}" alt="${photo.caption || 'Journal photo'}" loading="lazy" />
            ${photo.caption ? `<p class="photo-caption">${photo.caption}</p>` : ''}
          </div>
        `).join('')}
      </div>
    ` : '';
    
    return `
      <div class="entry">
        <div class="entry-header">
          <strong>${date}</strong>
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
    status: orderDetailsHTML,
    priority: orderDetailsHTML,
    customer: orderDetailsHTML,
    customer_ref: orderDetailsHTML,
    location: orderDetailsHTML,
    due_date: orderDetailsHTML,
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
  let orderDetailsAdded = false;
  
  for (const fieldConfigItem of fieldConfig) {
    if (fieldConfigItem.type === 'page_break' && fieldConfigItem.visible) {
      bodyContent += '<div class="page-break"></div>';
    } else if (fieldConfigItem.type === 'line_break' && fieldConfigItem.visible) {
      bodyContent += '<div class="line-break"></div>';
    } else if (fieldConfigItem.type === 'horizontal_line' && fieldConfigItem.visible) {
      bodyContent += '<hr class="horizontal-line" />';
    } else if (fieldConfigItem.field === 'title' && isFieldVisible('title')) {
      bodyContent += contentSections.title;
    } else if (fieldConfigItem.field === 'logo' && isFieldVisible('logo')) {
      bodyContent += contentSections.logo;
    } else if (fieldConfigItem.field === 'description') {
      bodyContent += contentSections.description;
    } else if (fieldConfigItem.field === 'summary') {
      bodyContent += contentSections.summary;
    } else if (fieldConfigItem.field === 'summary_entries') {
      bodyContent += contentSections.summary_entries;
    } else if (fieldConfigItem.field === 'man_hours') {
      bodyContent += contentSections.man_hours;
    } else if (fieldConfigItem.field === 'hours_by_day') {
      bodyContent += contentSections.hours_by_day;
    } else if (fieldConfigItem.field === 'journal_entries') {
      bodyContent += contentSections.journal_entries;
    } else if (['status', 'priority', 'customer', 'customer_ref', 'location', 'due_date'].includes(fieldConfigItem.field)) {
      if (!orderDetailsAdded && orderDetailsHTML) {
        bodyContent += orderDetailsHTML;
        orderDetailsAdded = true;
      }
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
          .order-details h2 {
            margin-top: 0;
            margin-bottom: 15px;
          }
          .detail-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 10px 0;
          }
          .field-item {
            padding: 8px 0;
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
          .hours-by-stage {
            margin-top: 10px;
            padding-left: 15px;
            font-size: 14px;
            color: #666;
          }
          .stage-item {
            padding: 4px 0;
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
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 5px 15px;
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
          .photo-item {
            page-break-inside: avoid;
          }
          .photo-item img {
            width: 100%;
            height: auto;
            object-fit: contain;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }
          .photo-caption {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
          }
          .page-break {
            page-break-after: always !important;
            break-after: page !important;
            display: block !important;
            height: 1px;
            margin: 0;
            padding: 0;
            clear: both;
          }
          .line-break {
            display: block;
            height: 20px;
            margin: 10px 0;
          }
          .horizontal-line {
            border: none;
            border-top: 1px solid #e5e7eb;
            margin: 20px 0;
          }
          /* Ensure text is selectable in PDF */
          * {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
          }
          @media print {
            @page {
              margin: ${settings.pageMargin}mm;
            }
            body {
              padding: 0;
              margin: 0;
            }
            .photo-item {
              page-break-inside: avoid;
            }
            .page-break {
              page-break-after: always !important;
              break-after: page !important;
              display: block !important;
              height: 0 !important;
            }
            * {
              -webkit-user-select: text !important;
              user-select: text !important;
            }
          }
        </style>
      </head>
      <body>
        ${bodyContent || `
          <h1>${orderTitle} - ${t.allJournalEntries}</h1>
          ${logoHTML}
          ${orderDetailsHTML}
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
          // Wait for images to load before printing
          Promise.all(Array.from(document.images).filter(img => !img.complete).map(img => 
            new Promise(resolve => { img.onload = img.onerror = resolve; })
          )).then(() => {
            // Use requestAnimationFrame for smoother rendering
            requestAnimationFrame(() => {
              window.print();
            });
          });
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

// Helper function to generate HTML for PDF blob (shared logic)
const generatePDFHTML = (
  entries: JournalEntry[], 
  orderTitle: string, 
  order: Order, 
  language: 'en' | 'sv' = 'en', 
  logoUrl?: string, 
  entryPhotos?: Record<string, Photo[]>, 
  summaryEntries?: SummaryEntry[], 
  dateFormat: DateFormatType = 'MM/DD/YYYY',
  layoutSettings?: PDFLayoutSettings
): string => {
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
  const uniqueTechnicians = new Set(order.time_entries?.map(e => e.technician_name) || []);
  const technicianCount = uniqueTechnicians.size;

  // Group hours by day
  const hoursByDay = order.time_entries?.reduce((acc, entry) => {
    const date = formatDate(entry.work_date, dateFormat);
    acc[date] = (acc[date] || 0) + Number(entry.hours_worked || 0);
    return acc;
  }, {} as Record<string, number>) || {};

  // Group time entries by stage
  const entriesByStage: Record<string, any[]> = {};
  const noStageEntries: any[] = [];
  
  order.time_entries?.forEach(entry => {
    if (entry.stage_name) {
      if (!entriesByStage[entry.stage_name]) {
        entriesByStage[entry.stage_name] = [];
      }
      entriesByStage[entry.stage_name].push(entry);
    } else {
      noStageEntries.push(entry);
    }
  });

  const logoHTML = (logoUrl && settings.showLogo) ? `<div style="text-align: left; margin-top: 15px; margin-bottom: 20px;"><img src="${logoUrl}" alt="Company Logo" style="max-height: ${settings.logoMaxHeight}px; max-width: 200px;" /></div>` : '';

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
    { field: 'hours_by_day', label: t.hoursByDay, visible: true, order: 13 },
    { field: 'journal_entries', label: t.journalEntries, visible: true, order: 14 },
  ];

  const isFieldVisible = (fieldName: string) => {
    const config = fieldConfig.find(f => f.field === fieldName);
    return config ? config.visible : true;
  };

  const titleFontSize = layoutSettings?.titleFontSize || 24;

  // Build order details fields
  const orderDetailsFields = [
    { field: 'status', label: t.status, value: order.status ? t[order.status as keyof PDFTranslations] || order.status : null },
    { field: 'priority', label: t.priority, value: order.priority ? t[order.priority as keyof PDFTranslations] || order.priority : null },
    { field: 'customer', label: t.customer, value: order.customer },
    { field: 'customer_ref', label: t.customerRef, value: order.customer_ref },
    { field: 'location', label: t.location, value: order.location },
    { field: 'due_date', label: t.dueDate, value: order.due_date ? formatDate(order.due_date, dateFormat) : null },
  ];

  const visibleDetailsFields = orderDetailsFields.filter(f => isFieldVisible(f.field) && f.value);

  const orderDetailsHTML = visibleDetailsFields.length > 0 ? `
    <div class="order-details">
      <h2>${t.orderDetails}</h2>
      <div class="detail-grid">
        ${visibleDetailsFields.map(f => `<div class="field-item"><strong>${f.label}:</strong> ${f.value}</div>`).join('')}
      </div>
    </div>
  ` : '';

  const descriptionHTML = order.description && isFieldVisible('description') ? `
    <div class="field-section"><strong>${t.description}:</strong> ${order.description}</div>
  ` : '';

  const manHoursHTML = isFieldVisible('man_hours') ? `
    <div class="man-hours">
      <strong>${t.totalManHours}:</strong> ${totalHours.toFixed(2)} ${t.hours} (${technicianCount} technician${technicianCount !== 1 ? 's' : ''})
      ${Object.keys(entriesByStage).length > 0 || noStageEntries.length > 0 ? `
        <div class="hours-by-stage">
          ${Object.entries(entriesByStage).map(([stageName, entries]) => {
            const stageHours = entries.reduce((sum: number, e: any) => sum + Number(e.hours_worked || 0), 0);
            const stageTechs = new Set(entries.map((e: any) => e.technician_name)).size;
            return `<div class="stage-item">• ${stageName}: ${stageHours.toFixed(2)} ${t.hours} (${stageTechs} tech${stageTechs !== 1 ? 's' : ''})</div>`;
          }).join('')}
          ${noStageEntries.length > 0 ? (() => {
            const noStageHours = noStageEntries.reduce((sum, e) => sum + Number(e.hours_worked || 0), 0);
            const noStageTechs = new Set(noStageEntries.map(e => e.technician_name)).size;
            return `<div class="stage-item">• No Stage: ${noStageHours.toFixed(2)} ${t.hours} (${noStageTechs} tech${noStageTechs !== 1 ? 's' : ''})</div>`;
          })() : ''}
        </div>
      ` : ''}
    </div>
  ` : '';

  const hoursByDayHTML_Section = isFieldVisible('hours_by_day') && Object.keys(hoursByDay).length > 0 ? `
    <div class="hours-by-day-section">
      <strong>${t.hoursByDay}:</strong>
      <div class="hours-by-day">
        ${Object.entries(hoursByDay)
          .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
          .map(([date, hours]) => `<div>${date}: ${hours.toFixed(2)} ${t.hours}</div>`)
          .join('')}
      </div>
    </div>
  ` : '';

  const summaryHTML = order.summary && isFieldVisible('summary') ? `
    <div class="order-summary"><h2>${t.summary}</h2><p>${order.summary.replace(/\n/g, '<br>')}</p></div>
  ` : '';

  const summaryEntriesHTML = summaryEntries && summaryEntries.length > 0 && isFieldVisible('summary_entries') ? `
    <div class="summary-entries-section">
      <h2>${t.summaryEntries}</h2>
      ${summaryEntries.map(entry => `<div class="summary-entry"><div class="entry-content">${entry.content.replace(/\n/g, '<br>')}</div></div>`).join('')}
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
        <div class="entry-header"><strong>${date}</strong></div>
        <div class="entry-content">${entry.content.replace(/\n/g, '<br>')}</div>
        ${photosHTML}
      </div>
    `;
  }).join('');

  // Build content sections
  const contentSections: Record<string, string> = {
    title: isFieldVisible('title') ? `<h1>${orderTitle} - ${t.allJournalEntries}</h1>` : '',
    logo: (logoUrl && settings.showLogo && isFieldVisible('logo')) ? logoHTML : '',
    description: descriptionHTML,
    summary: summaryHTML,
    summary_entries: summaryEntriesHTML,
    man_hours: manHoursHTML,
    hours_by_day: hoursByDayHTML_Section,
    journal_entries: isFieldVisible('journal_entries') ? `<div class="journal-entries-section"><h2>${t.journalEntries}</h2>${entriesHTML}</div>` : '',
  };

  let bodyContent = '';
  let orderDetailsAdded = false;
  
  for (const fieldConfigItem of fieldConfig) {
    if (fieldConfigItem.type === 'page_break' && fieldConfigItem.visible) {
      bodyContent += '<div class="page-break"></div>';
    } else if (fieldConfigItem.type === 'line_break' && fieldConfigItem.visible) {
      bodyContent += '<div class="line-break"></div>';
    } else if (fieldConfigItem.type === 'horizontal_line' && fieldConfigItem.visible) {
      bodyContent += '<hr class="horizontal-line" />';
    } else if (fieldConfigItem.field === 'title' && isFieldVisible('title')) {
      bodyContent += contentSections.title;
    } else if (fieldConfigItem.field === 'logo' && isFieldVisible('logo')) {
      bodyContent += contentSections.logo;
    } else if (fieldConfigItem.field === 'description') {
      bodyContent += contentSections.description;
    } else if (fieldConfigItem.field === 'summary') {
      bodyContent += contentSections.summary;
    } else if (fieldConfigItem.field === 'summary_entries') {
      bodyContent += contentSections.summary_entries;
    } else if (fieldConfigItem.field === 'man_hours') {
      bodyContent += contentSections.man_hours;
    } else if (fieldConfigItem.field === 'hours_by_day') {
      bodyContent += contentSections.hours_by_day;
    } else if (fieldConfigItem.field === 'journal_entries') {
      bodyContent += contentSections.journal_entries;
    } else if (['status', 'priority', 'customer', 'customer_ref', 'location', 'due_date'].includes(fieldConfigItem.field)) {
      if (!orderDetailsAdded && orderDetailsHTML) {
        bodyContent += orderDetailsHTML;
        orderDetailsAdded = true;
      }
    }
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${t.journalEntries} - ${orderTitle}</title>
        <style>
          body {
            font-family: ${settings.fontFamily};
            padding: ${settings.pageMargin}mm;
            max-width: 800px;
            margin: 0 auto;
            font-size: 12px;
            line-height: 1.4;
          }
          h1 {
            color: ${settings.primaryColor};
            border-bottom: 2px solid ${settings.primaryColor};
            padding-bottom: 10px;
            font-size: ${titleFontSize}px;
            margin-top: 0;
          }
          h2 {
            color: #333;
            margin-top: 15px;
            margin-bottom: 8px;
            font-size: 16px;
          }
          .order-details {
            margin: 15px 0;
            padding: 12px;
            background: #f9fafb;
            border-radius: 8px;
          }
          .order-details h2 { margin-top: 0; margin-bottom: 10px; }
          .detail-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .field-item { padding: 5px 0; }
          .order-summary {
            margin: 15px 0;
            padding: 12px;
            background: #f0f9ff;
            border-left: 4px solid ${settings.primaryColor};
            border-radius: 4px;
          }
          .order-summary p { margin: 8px 0 0 0; line-height: 1.5; }
          .hours-by-stage { margin-top: 8px; padding-left: 12px; font-size: 11px; color: #666; }
          .stage-item { padding: 2px 0; }
          .man-hours {
            margin-top: 12px;
            padding: 8px;
            background: #fff;
            border-left: 4px solid ${settings.primaryColor};
            font-size: 13px;
          }
          .hours-by-day-section {
            margin-top: 12px;
            padding: 8px;
            background: #f9fafb;
            border-radius: 4px;
          }
          .hours-by-day {
            margin-top: 8px;
            font-size: 11px;
            color: #666;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 4px 12px;
          }
          .field-section {
            margin: 8px 0;
            padding: 8px;
            background: #f9fafb;
            border-radius: 4px;
          }
          .summary-entries-section { margin: 15px 0; }
          .summary-entry {
            margin: 10px 0;
            padding: 10px;
            background: #f0f9ff;
            border-left: 4px solid ${settings.primaryColor};
            border-radius: 4px;
          }
          .journal-entries-section { margin-top: 20px; }
          .entry {
            margin: 20px 0;
            padding: 12px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
          }
          .entry-header { color: #666; font-size: 11px; margin-bottom: 8px; }
          .entry-content { line-height: 1.5; }
          .entry-photos {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-top: 10px;
          }
          .photo-item { page-break-inside: avoid; }
          .photo-item img {
            width: 100%;
            height: auto;
            object-fit: contain;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
          }
          .photo-caption { font-size: 10px; color: #666; margin-top: 4px; }
          .page-break { page-break-after: always !important; break-after: page !important; }
          .line-break { display: block; height: 15px; }
          .horizontal-line { border: none; border-top: 1px solid #e5e7eb; margin: 15px 0; }
        </style>
      </head>
      <body>
        ${bodyContent || `
          <h1>${orderTitle} - ${t.allJournalEntries}</h1>
          ${logoHTML}
          ${orderDetailsHTML}
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
      </body>
    </html>
  `;
};

// Generate PDF blob for ZIP bundling (uses jsPDF with proper text rendering)
export const generatePDFBlob = async (
  entries: JournalEntry[], 
  orderTitle: string, 
  order: Order, 
  language: 'en' | 'sv' = 'en', 
  logoUrl?: string, 
  entryPhotos?: Record<string, Photo[]>, 
  summaryEntries?: SummaryEntry[], 
  dateFormat: DateFormatType = 'MM/DD/YYYY',
  layoutSettings?: PDFLayoutSettings
): Promise<Blob> => {
  const t = translations[language];
  
  const settings = {
    primaryColor: layoutSettings?.primaryColor || '#2563eb',
    fontFamily: layoutSettings?.fontFamily || 'helvetica',
    pageMargin: layoutSettings?.pageMargin || 20,
    titleFontSize: layoutSettings?.titleFontSize || 18,
  };

  // Create PDF document
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = settings.pageMargin;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // Helper to check and add new page if needed
  const checkNewPage = (requiredHeight: number = 20) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }
  };

  // Helper to add wrapped text
  const addWrappedText = (text: string, fontSize: number, isBold: boolean = false, color: number[] = [0, 0, 0]) => {
    pdf.setFontSize(fontSize);
    pdf.setFont(settings.fontFamily, isBold ? 'bold' : 'normal');
    pdf.setTextColor(color[0], color[1], color[2]);
    
    const lines = pdf.splitTextToSize(text, contentWidth);
    const lineHeight = fontSize * 0.4;
    
    for (const line of lines) {
      checkNewPage(lineHeight + 2);
      pdf.text(line, margin, yPosition);
      yPosition += lineHeight;
    }
    yPosition += 2;
  };

  // Parse hex color to RGB
  const hexToRgb = (hex: string): number[] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [37, 99, 235]; // default blue
  };

  const primaryRgb = hexToRgb(settings.primaryColor);

  // Title
  addWrappedText(`${orderTitle} - ${t.allJournalEntries}`, settings.titleFontSize, true, primaryRgb);
  
  // Draw title underline
  pdf.setDrawColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // Order Details Section
  const orderDetailsFields = [
    { label: t.status, value: order.status ? t[order.status as keyof PDFTranslations] || order.status : null },
    { label: t.priority, value: order.priority ? t[order.priority as keyof PDFTranslations] || order.priority : null },
    { label: t.customer, value: order.customer },
    { label: t.customerRef, value: order.customer_ref },
    { label: t.location, value: order.location },
    { label: t.dueDate, value: order.due_date ? formatDate(order.due_date, dateFormat) : null },
  ].filter(f => f.value);

  if (orderDetailsFields.length > 0) {
    checkNewPage(30);
    addWrappedText(t.orderDetails, 14, true, [51, 51, 51]);
    
    // Create table for order details
    autoTable(pdf, {
      startY: yPosition,
      head: [],
      body: orderDetailsFields.map(f => [f.label, f.value as string]),
      theme: 'plain',
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: contentWidth - 40 },
      },
      margin: { left: margin, right: margin },
    });
    
    yPosition = (pdf as any).lastAutoTable.finalY + 8;
  }

  // Description
  if (order.description) {
    checkNewPage(20);
    addWrappedText(`${t.description}:`, 11, true, [51, 51, 51]);
    addWrappedText(order.description, 10, false, [102, 102, 102]);
    yPosition += 5;
  }

  // Total Man Hours
  const totalHours = order.time_entries?.reduce((sum, entry) => sum + Number(entry.hours_worked || 0), 0) || 0;
  const uniqueTechnicians = new Set(order.time_entries?.map(e => e.technician_name) || []);
  const technicianCount = uniqueTechnicians.size;

  checkNewPage(15);
  addWrappedText(`${t.totalManHours}: ${totalHours.toFixed(2)} ${t.hours} (${technicianCount} technician${technicianCount !== 1 ? 's' : ''})`, 11, true, [51, 51, 51]);
  yPosition += 3;

  // Hours by day
  const hoursByDay = order.time_entries?.reduce((acc, entry) => {
    const date = formatDate(entry.work_date, dateFormat);
    acc[date] = (acc[date] || 0) + Number(entry.hours_worked || 0);
    return acc;
  }, {} as Record<string, number>) || {};

  if (Object.keys(hoursByDay).length > 0) {
    checkNewPage(20);
    addWrappedText(`${t.hoursByDay}:`, 11, true, [51, 51, 51]);
    
    const hoursData = Object.entries(hoursByDay)
      .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
      .map(([date, hours]) => [date, `${hours.toFixed(2)} ${t.hours}`]);
    
    if (hoursData.length > 0) {
      autoTable(pdf, {
        startY: yPosition,
        head: [],
        body: hoursData,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        margin: { left: margin, right: margin },
      });
      yPosition = (pdf as any).lastAutoTable.finalY + 5;
    }
  }

  // Summary
  if (order.summary) {
    checkNewPage(25);
    addWrappedText(t.summary, 14, true, [51, 51, 51]);
    addWrappedText(order.summary, 10, false, [51, 51, 51]);
    yPosition += 5;
  }

  // Summary Entries
  if (summaryEntries && summaryEntries.length > 0) {
    checkNewPage(25);
    addWrappedText(t.summaryEntries, 14, true, [51, 51, 51]);
    
    for (const entry of summaryEntries) {
      checkNewPage(15);
      addWrappedText(entry.content, 10, false, [51, 51, 51]);
      yPosition += 3;
    }
    yPosition += 5;
  }

  // Journal Entries Section
  if (entries.length > 0) {
    checkNewPage(30);
    addWrappedText(t.journalEntries, 14, true, [51, 51, 51]);
    yPosition += 3;

    for (const entry of entries) {
      checkNewPage(25);
      
      const entryDate = formatDate(entry.created_at, dateFormat);
      
      // Entry date header
      pdf.setFillColor(249, 250, 251);
      pdf.rect(margin, yPosition - 3, contentWidth, 8, 'F');
      addWrappedText(entryDate, 11, true, [102, 102, 102]);
      yPosition += 2;
      
      // Entry content
      addWrappedText(entry.content, 10, false, [51, 51, 51]);
      
      // Add separator line
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.2);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;
    }
  }

  return pdf.output('blob');
};

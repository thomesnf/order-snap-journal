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
  photoScale?: number;
  photoColumns?: number;
  orderDetailsColumns?: number;
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
    photoScale: layoutSettings?.photoScale ?? 100,
    photoColumns: layoutSettings?.photoColumns ?? 2,
    orderDetailsColumns: layoutSettings?.orderDetailsColumns ?? 2,
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
            grid-template-columns: repeat(${settings.orderDetailsColumns}, 1fr);
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
            grid-template-columns: repeat(${settings.photoColumns}, 1fr);
            gap: 15px;
            margin-top: 15px;
          }
          .photo-item {
            page-break-inside: avoid;
          }
          .photo-item img {
            width: ${settings.photoScale}%;
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
    photoScale: layoutSettings?.photoScale ?? 100,
    photoColumns: layoutSettings?.photoColumns ?? 2,
    orderDetailsColumns: layoutSettings?.orderDetailsColumns ?? 2,
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
            grid-template-columns: repeat(${settings.orderDetailsColumns}, 1fr);
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
            grid-template-columns: repeat(${settings.photoColumns}, 1fr);
            gap: 10px;
            margin-top: 10px;
          }
          .photo-item { page-break-inside: avoid; }
          .photo-item img {
            width: ${settings.photoScale}%;
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

// Generate PDF blob by reusing the same HTML rendering as exportMultipleEntriesToPDF
// Uses an iframe + print-to-PDF approach for exact visual parity
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
  // Generate the exact same HTML as exportMultipleEntriesToPDF
  const html = generatePDFHTML(
    entries,
    orderTitle,
    order,
    language,
    logoUrl,
    entryPhotos,
    summaryEntries,
    dateFormat,
    layoutSettings
  );

  // Create a hidden iframe to render the HTML
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  iframe.style.width = '800px';
  iframe.style.height = '1200px';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error('Could not create iframe document');
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // Wait for all images to load
  await new Promise<void>((resolve) => {
    const images = iframeDoc.querySelectorAll('img');
    if (images.length === 0) {
      resolve();
      return;
    }

    let loadedCount = 0;
    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount >= images.length) {
        resolve();
      }
    };

    images.forEach((img) => {
      if (img.complete) {
        checkAllLoaded();
      } else {
        img.onload = checkAllLoaded;
        img.onerror = checkAllLoaded;
      }
    });

    // Timeout after 10 seconds
    setTimeout(resolve, 10000);
  });

  // Give a moment for rendering
  await new Promise(resolve => setTimeout(resolve, 500));

  const settings = {
    pageMargin: layoutSettings?.pageMargin || 20,
  };

  // Use jsPDF to create PDF from the rendered content
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = settings.pageMargin;
  const contentWidth = pageWidth - (margin * 2);

  // Get the body content from iframe
  const body = iframeDoc.body;
  
  // Convert the HTML content using html2canvas-like approach via jsPDF html method
  // But since that can be problematic, we'll extract content and render it natively

  // Clean up iframe
  document.body.removeChild(iframe);

  // Since html2canvas approach has issues, we'll generate native PDF
  // by parsing the HTML and rendering elements directly
  
  return await generateNativePDFFromOrder(
    entries,
    orderTitle,
    order,
    language,
    logoUrl,
    entryPhotos,
    summaryEntries,
    dateFormat,
    layoutSettings
  );
};

// Helper to load images safely for jsPDF.
// We always rasterize to JPEG via canvas to avoid format/decoder edge-cases
// (signed URLs, webp, partial loads) that can cause striped/garbled images.
const loadImageAsJpegDataUrl = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) return null;
    if (!contentType.toLowerCase().startsWith('image/')) return null;

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    try {
      const img = new Image();
      // Note: signed URLs may not support CORS headers. We don't need pixel access
      // when drawing from blob/object URL (same-origin), so this is safe.
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = objectUrl;
      });

      if (!img.width || !img.height) return null;

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Ensure a white background for transparent PNGs
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      return canvas.toDataURL('image/jpeg', 0.92);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
};

// Generate native PDF with all elements matching the HTML export EXACTLY
// This must produce identical output to exportMultipleEntriesToPDF
const generateNativePDFFromOrder = async (
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
    showLogo: layoutSettings?.showLogo !== false,
    logoMaxHeight: layoutSettings?.logoMaxHeight || 25,
    photoScale: layoutSettings?.photoScale ?? 100,
    photoColumns: layoutSettings?.photoColumns ?? 2,
    orderDetailsColumns: layoutSettings?.orderDetailsColumns ?? 2,
  };

  // Default field config matching the single export format:
  // Title -> Logo -> Order Details (Kund, Kundreferens, Adress) -> Man Hours -> Hours by Day -> Summary Entries -> Journal Entries
  const fieldConfig = layoutSettings?.fieldConfig || [
    { field: 'title', label: 'Title', visible: true, order: 1 },
    { field: 'logo', label: 'Logo', visible: true, order: 2 },
    { field: 'customer', label: t.customer, visible: true, order: 3 },
    { field: 'customer_ref', label: t.customerRef, visible: true, order: 4 },
    { field: 'location', label: t.location, visible: true, order: 5 },
    { field: 'man_hours', label: t.totalManHours, visible: true, order: 6 },
    { field: 'hours_by_day', label: t.hoursByDay, visible: true, order: 7 },
    { field: 'summary_entries', label: t.summaryEntries, visible: true, order: 8 },
    { field: 'journal_entries', label: t.journalEntries, visible: true, order: 9 },
    // These fields are hidden by default to match single-export PDF layout
    { field: 'status', label: t.status, visible: false, order: 10 },
    { field: 'priority', label: t.priority, visible: false, order: 11 },
    { field: 'due_date', label: t.dueDate, visible: false, order: 12 },
    { field: 'description', label: t.description, visible: false, order: 13 },
    { field: 'summary', label: t.summary, visible: false, order: 14 },
  ];

  const isFieldVisible = (fieldName: string) => {
    const config = fieldConfig.find(f => f.field === fieldName);
    return config ? config.visible : true;
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
    ] : [37, 99, 235];
  };

  const primaryRgb = hexToRgb(settings.primaryColor);

  // Title
  if (isFieldVisible('title')) {
    addWrappedText(`${orderTitle} - ${t.allJournalEntries}`, settings.titleFontSize, true, primaryRgb);
    
    // Draw title underline
    pdf.setDrawColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
  }

  // Company Logo (UNDER header, matching order-page export layout)
  if (logoUrl && settings.showLogo && isFieldVisible('logo')) {
    try {
      const logoJpeg = await loadImageAsJpegDataUrl(logoUrl);
      if (logoJpeg) {
        const img = new Image();
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = logoJpeg;
        });

        if (img.width > 0) {
          const maxHeight = settings.logoMaxHeight;
          const maxWidth = 60;
          const aspectRatio = img.width / img.height;
          let imgWidth = maxWidth;
          let imgHeight = imgWidth / aspectRatio;

          if (imgHeight > maxHeight) {
            imgHeight = maxHeight;
            imgWidth = imgHeight * aspectRatio;
          }

          checkNewPage(imgHeight + 8);
          pdf.addImage(logoJpeg, 'JPEG', margin, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 8;
        }
      }
    } catch {
      // Continue without logo
    }
  }

  // Order Details Section - matching single export table format
  // Only show: Kund, Kundreferens, Adress (in a simple table like the reference PDF)
  const orderDetailsFields = [
    { field: 'customer', label: t.customer, value: order.customer },
    { field: 'customer_ref', label: t.customerRef, value: order.customer_ref },
    { field: 'location', label: t.location, value: order.location },
  ].filter(f => isFieldVisible(f.field) && f.value);

  if (orderDetailsFields.length > 0) {
    checkNewPage(30);
    addWrappedText(t.orderDetails, 14, true, [51, 51, 51]);
    
    // Use autoTable for clean table layout - supports 1 or 2 columns
    if (settings.orderDetailsColumns === 1) {
      // Single column layout - stacked
      autoTable(pdf, {
        startY: yPosition,
        head: [],
        body: orderDetailsFields.map(f => [f.label, f.value as string]),
        theme: 'plain',
        styles: {
          fontSize: 10,
          cellPadding: 3,
          lineColor: [229, 231, 235],
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 40 },
          1: { cellWidth: contentWidth - 40 },
        },
        margin: { left: margin, right: margin },
        tableLineColor: [229, 231, 235],
        tableLineWidth: 0.1,
      });
    } else {
      // Two column layout - side by side pairs
      const rows: string[][] = [];
      for (let i = 0; i < orderDetailsFields.length; i += 2) {
        const field1 = orderDetailsFields[i];
        const field2 = orderDetailsFields[i + 1];
        if (field2) {
          rows.push([field1.label, field1.value as string, field2.label, field2.value as string]);
        } else {
          rows.push([field1.label, field1.value as string, '', '']);
        }
      }
      
      autoTable(pdf, {
        startY: yPosition,
        head: [],
        body: rows,
        theme: 'plain',
        styles: {
          fontSize: 10,
          cellPadding: 3,
          lineColor: [229, 231, 235],
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: contentWidth * 0.2 },
          1: { cellWidth: contentWidth * 0.3 },
          2: { fontStyle: 'bold', cellWidth: contentWidth * 0.2 },
          3: { cellWidth: contentWidth * 0.3 },
        },
        margin: { left: margin, right: margin },
        tableLineColor: [229, 231, 235],
        tableLineWidth: 0.1,
      });
    }
    
    yPosition = (pdf as any).lastAutoTable.finalY + 8;
  }

  // Total Man Hours - format matching single export exactly
  if (isFieldVisible('man_hours')) {
    const totalHours = order.time_entries?.reduce((sum, entry) => sum + Number(entry.hours_worked || 0), 0) || 0;
    const uniqueTechnicians = new Set(order.time_entries?.map(e => e.technician_name) || []);
    const technicianCount = uniqueTechnicians.size;

    // Group by stage
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

    checkNewPage(20);
    // Main man hours line with technician count
    addWrappedText(`${t.totalManHours}: ${totalHours.toFixed(2)} ${t.hours} (${technicianCount} technician${technicianCount !== 1 ? 's' : ''})`, 11, true, [51, 51, 51]);
    
    // Stage breakdown with bullet points
    for (const [stageName, stageEntries] of Object.entries(entriesByStage)) {
      const stageHours = stageEntries.reduce((sum: number, e: any) => sum + Number(e.hours_worked || 0), 0);
      const stageTechs = new Set(stageEntries.map((e: any) => e.technician_name)).size;
      addWrappedText(`• ${stageName}: ${stageHours.toFixed(2)} ${t.hours} (${stageTechs} tech${stageTechs !== 1 ? 's' : ''})`, 10, false, [51, 51, 51]);
    }
    
    if (noStageEntries.length > 0) {
      const noStageHours = noStageEntries.reduce((sum, e) => sum + Number(e.hours_worked || 0), 0);
      const noStageTechs = new Set(noStageEntries.map(e => e.technician_name)).size;
      addWrappedText(`• No Stage: ${noStageHours.toFixed(2)} ${t.hours} (${noStageTechs} tech${noStageTechs !== 1 ? 's' : ''})`, 10, false, [51, 51, 51]);
    }
    
    yPosition += 5;
  }

  // Hours by Day - displayed in a TABLE format like the single export
  if (isFieldVisible('hours_by_day') && order.time_entries && order.time_entries.length > 0) {
    const hoursByDay = order.time_entries.reduce((acc, entry) => {
      const date = formatDate(entry.work_date, dateFormat);
      acc[date] = (acc[date] || 0) + Number(entry.hours_worked || 0);
      return acc;
    }, {} as Record<string, number>);

    if (Object.keys(hoursByDay).length > 0) {
      checkNewPage(20);
      addWrappedText(`${t.hoursByDay}:`, 11, true, [51, 51, 51]);
      
      const sortedEntries = Object.entries(hoursByDay).sort(([a], [b]) => {
        // Parse dates in MM/DD/YYYY format for proper sorting
        const parseDate = (dateStr: string) => {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
          }
          return new Date(dateStr);
        };
        return parseDate(a).getTime() - parseDate(b).getTime();
      });
      
      // Use table format matching single export
      autoTable(pdf, {
        startY: yPosition,
        head: [],
        body: sortedEntries.map(([date, hours]) => [date, `${hours.toFixed(2)} ${t.hours}`]),
        theme: 'plain',
        styles: {
          fontSize: 10,
          cellPadding: 2,
          lineColor: [229, 231, 235],
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 35 },
        },
        margin: { left: margin, right: margin },
        tableWidth: 70,
      });
      
      yPosition = (pdf as any).lastAutoTable.finalY + 8;
    }
  }

  // Summary Entries - placed BEFORE journal entries, matching single export order
  if (summaryEntries && summaryEntries.length > 0 && isFieldVisible('summary_entries')) {
    checkNewPage(25);
    addWrappedText(t.summaryEntries, 14, true, [51, 51, 51]);
    
    for (const entry of summaryEntries) {
      checkNewPage(15);
      // Format each entry with bullet point
      addWrappedText(`• ${entry.content}`, 10, false, [51, 51, 51]);
      yPosition += 3;
    }
    yPosition += 5;
  }

  // Journal Entries Section
  if (entries.length > 0 && isFieldVisible('journal_entries')) {
    checkNewPage(30);
    addWrappedText(t.journalEntries, 14, true, [51, 51, 51]);
    yPosition += 3;

    for (const entry of entries) {
      checkNewPage(25);
      
      const entryDate = formatDate(entry.created_at, dateFormat);
      
      // Entry date header with background
      pdf.setFillColor(249, 250, 251);
      pdf.rect(margin, yPosition - 3, contentWidth, 8, 'F');
      addWrappedText(`${entryDate}`, 11, true, [102, 102, 102]);
      
      // Entry content
      addWrappedText(entry.content, 10, false, [51, 51, 51]);
      yPosition += 3;
      
      // Add photos for this journal entry with multi-column support
      const photos = entryPhotos?.[entry.id] || [];
      if (photos.length > 0) {
        const numColumns = settings.photoColumns;
        const gutter = 4; // Gap between photos in mm
        const totalGutters = (numColumns - 1) * gutter;
        const baseColWidth = (contentWidth - totalGutters) / numColumns;
        const scaleFactor = settings.photoScale / 100;
        const colWidth = baseColWidth * scaleFactor;
        const maxImgHeight = 60 * scaleFactor;
        
        let photoIndex = 0;
        let currentRowStartY = yPosition;
        let maxRowHeight = 0;
        
        for (const photo of photos) {
          try {
            const photoJpeg = await loadImageAsJpegDataUrl(photo.url);
            if (photoJpeg) {
              const img = new Image();
              await new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
                img.src = photoJpeg;
              });
              
              if (img.width > 0) {
                const aspectRatio = img.width / img.height;
                let imgWidth = colWidth;
                let imgHeight = imgWidth / aspectRatio;
                
                if (imgHeight > maxImgHeight) {
                  imgHeight = maxImgHeight;
                  imgWidth = imgHeight * aspectRatio;
                }
                
                // Calculate column position
                const colIndex = photoIndex % numColumns;
                
                // Check if starting a new row
                if (colIndex === 0) {
                  // If not the first row, add the max height from previous row
                  if (photoIndex > 0) {
                    yPosition = currentRowStartY + maxRowHeight + 8;
                    if (photo.caption) yPosition += 6;
                  }
                  currentRowStartY = yPosition;
                  maxRowHeight = 0;
                  
                  // Check if we need a new page for this row
                  checkNewPage(imgHeight + 15);
                  currentRowStartY = yPosition;
                }
                
                // Calculate X position for this column
                const xPosition = margin + colIndex * (baseColWidth + gutter);
                
                pdf.addImage(photoJpeg, 'JPEG', xPosition, currentRowStartY, imgWidth, imgHeight);
                
                // Track max height in this row (including caption if present)
                let totalPhotoHeight = imgHeight;
                if (photo.caption) {
                  pdf.setFontSize(9);
                  pdf.setTextColor(102, 102, 102);
                  pdf.text(photo.caption, xPosition, currentRowStartY + imgHeight + 4, { maxWidth: colWidth });
                  totalPhotoHeight += 8;
                }
                
                if (totalPhotoHeight > maxRowHeight) {
                  maxRowHeight = totalPhotoHeight;
                }
                
                photoIndex++;
              }
            }
          } catch (e) {
            // Continue if photo fails to load
          }
        }
        
        // After all photos, update yPosition based on last row
        if (photoIndex > 0) {
          yPosition = currentRowStartY + maxRowHeight + 5;
        }
      }
      
      // Add separator line
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.2);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;
    }
  }

  return pdf.output('blob');
};

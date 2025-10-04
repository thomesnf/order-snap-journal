import { format } from 'date-fns';

export type DateFormatType = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'DD.MM.YYYY';

const formatMap: Record<DateFormatType, string> = {
  'MM/DD/YYYY': 'MM/dd/yyyy',
  'DD/MM/YYYY': 'dd/MM/yyyy',
  'YYYY-MM-DD': 'yyyy-MM-dd',
  'DD.MM.YYYY': 'dd.MM.yyyy'
};

export const formatDate = (date: Date | string, dateFormat: DateFormatType = 'MM/DD/YYYY'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatMap[dateFormat]);
};

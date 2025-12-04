import { useLanguage } from '@/contexts/LanguageContext';
import { Order } from '@/hooks/useOrdersDB';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, LayoutGrid, List, SlidersHorizontal, X, Calendar } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface OrderFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: Order['status'] | 'all';
  setStatusFilter: (status: Order['status'] | 'all') => void;
  priorityFilter: Order['priority'] | 'all';
  setPriorityFilter: (priority: Order['priority'] | 'all') => void;
  sortBy: 'updated' | 'created' | 'due_date' | 'title';
  setSortBy: (sort: 'updated' | 'created' | 'due_date' | 'title') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  viewMode: 'card' | 'list';
  setViewMode: (mode: 'card' | 'list') => void;
  statusCounts: Record<string, number>;
  onShowCalendar: () => void;
}

export const OrderFilters = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  viewMode,
  setViewMode,
  statusCounts,
  onShowCalendar
}: OrderFiltersProps) => {
  const { t } = useLanguage();

  const hasActiveFilters = priorityFilter !== 'all' || sortBy !== 'updated' || sortOrder !== 'desc';

  const clearFilters = () => {
    setPriorityFilter('all');
    setSortBy('updated');
    setSortOrder('desc');
  };

  return (
    <div className="space-y-3">
      {/* Search and controls row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchOrders')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card border-border/50"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Calendar button */}
        <Button variant="outline" size="icon" onClick={onShowCalendar} className="shrink-0">
          <Calendar className="h-4 w-4" />
        </Button>

        {/* Advanced filters popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className={`shrink-0 ${hasActiveFilters ? 'border-primary text-primary' : ''}`}>
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">{t('filters')}</h4>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto p-0 text-xs text-muted-foreground">
                    {t('clearAll')}
                  </Button>
                )}
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">{t('priority')}</Label>
                <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as Order['priority'] | 'all')}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all')}</SelectItem>
                    <SelectItem value="high">{t('high')}</SelectItem>
                    <SelectItem value="medium">{t('medium')}</SelectItem>
                    <SelectItem value="low">{t('low')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{t('sortBy')}</Label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updated">{t('lastUpdated')}</SelectItem>
                    <SelectItem value="created">{t('dateCreated')}</SelectItem>
                    <SelectItem value="due_date">{t('dueDate')}</SelectItem>
                    <SelectItem value="title">{t('title')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{t('order')}</Label>
                <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">{t('newest')}</SelectItem>
                    <SelectItem value="asc">{t('oldest')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* View mode toggle */}
        <div className="flex border border-border rounded-md">
          <Button
            variant={viewMode === 'card' ? 'secondary' : 'ghost'}
            size="icon"
            className="rounded-r-none h-10 w-10"
            onClick={() => setViewMode('card')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="rounded-l-none h-10 w-10"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status filter badges */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {(['all', 'pending', 'in-progress', 'completed', 'invoiced', 'paid', 'cancelled'] as const).map((status) => (
          <Badge
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            className={`cursor-pointer whitespace-nowrap shrink-0 ${
              statusFilter === status 
              ? 'bg-primary text-primary-foreground' 
              : 'hover:bg-muted'
            }`}
            onClick={() => setStatusFilter(status)}
          >
            {status === 'all' ? t('all') : t(status === 'in-progress' ? 'inProgress' : status)} ({statusCounts[status]})
          </Badge>
        ))}
      </div>
    </div>
  );
};

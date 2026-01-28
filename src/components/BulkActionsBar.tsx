import { useLanguage } from '@/contexts/LanguageContext';
import { Order } from '@/hooks/useOrdersDB';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileText, 
  UserCog, 
  RefreshCw, 
  Trash2, 
  X,
  CheckSquare
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onExportJournals: () => void;
  onAssignTechnician: () => void;
  onChangeStatus: (status: Order['status']) => void;
  onDelete: () => void;
  isAdmin: boolean;
}

export const BulkActionsBar = ({
  selectedCount,
  totalCount,
  allSelected,
  onSelectAll,
  onDeselectAll,
  onExportJournals,
  onAssignTechnician,
  onChangeStatus,
  onDelete,
  isAdmin
}: BulkActionsBarProps) => {
  const { t } = useLanguage();

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border border-border shadow-lg rounded-lg px-4 py-3 flex items-center gap-4">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={allSelected}
          onCheckedChange={(checked) => {
            if (checked) {
              onSelectAll();
            } else {
              onDeselectAll();
            }
          }}
        />
        <span className="text-sm font-medium">
          {selectedCount} {t('selected')}
        </span>
      </div>

      <div className="h-6 w-px bg-border" />

      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onExportJournals}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          {t('exportJournals')}
        </Button>

        {isAdmin && (
          <>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onAssignTechnician}
              className="gap-2"
            >
              <UserCog className="h-4 w-4" />
              {t('assignTechnician')}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  {t('changeStatus')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onChangeStatus('pending')}>
                  {t('setPending')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeStatus('in-progress')}>
                  {t('setInProgress')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeStatus('completed')}>
                  {t('setCompleted')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeStatus('invoiced')}>
                  {t('setInvoiced')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeStatus('paid')}>
                  {t('setPaid')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeStatus('cancelled')}>
                  {t('setCancelled')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={onDelete}
              className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              {t('delete')}
            </Button>
          </>
        )}
      </div>

      <div className="h-6 w-px bg-border" />

      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onDeselectAll}
        className="gap-2"
      >
        <X className="h-4 w-4" />
        {t('clearSelection')}
      </Button>
    </div>
  );
};

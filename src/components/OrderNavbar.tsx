import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Settings, Shield, LogOut, FileBarChart, Calendar, Plus, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface OrderNavbarProps {
  companyLogoUrl?: string | null;
  fullName?: string;
  isAdmin: boolean;
  onCreateOrder: () => void;
  onShowSettings: () => void;
  onShowAdmin?: () => void;
  onShowCalendar: () => void;
}

export const OrderNavbar = ({
  companyLogoUrl,
  fullName,
  isAdmin,
  onCreateOrder,
  onShowSettings,
  onShowAdmin,
  onShowCalendar
}: OrderNavbarProps) => {
  const { t } = useLanguage();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo / Title */}
          <div className="flex items-center gap-3">
            {companyLogoUrl ? (
              <img 
                src={companyLogoUrl} 
                alt="Company Logo" 
                className="h-8 object-contain"
              />
            ) : (
              <h1 className="text-xl font-bold text-foreground">{t('orders')}</h1>
            )}
          </div>

          {/* Center - User name */}
          <div className="hidden md:flex items-center">
            <span className="text-sm font-medium text-muted-foreground">
              {fullName || user?.email}
            </span>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Quick actions - visible on larger screens */}
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onShowCalendar}>
                <Calendar className="h-4 w-4" />
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>
                  <FileBarChart className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Menu dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground md:hidden">
                  {fullName || user?.email}
                </div>
                <DropdownMenuSeparator className="md:hidden" />
                <DropdownMenuItem onClick={onShowCalendar} className="sm:hidden">
                  <Calendar className="h-4 w-4 mr-2" />
                  {t('calendar')}
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate('/reports')} className="sm:hidden">
                    <FileBarChart className="h-4 w-4 mr-2" />
                    {t('reports')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onShowSettings}>
                  <Settings className="h-4 w-4 mr-2" />
                  {t('settings')}
                </DropdownMenuItem>
                {isAdmin && onShowAdmin && (
                  <DropdownMenuItem onClick={onShowAdmin}>
                    <Shield className="h-4 w-4 mr-2" />
                    {t('admin')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* New Order button */}
            {isAdmin && (
              <Button onClick={onCreateOrder} size="sm" className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('newOrder')}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

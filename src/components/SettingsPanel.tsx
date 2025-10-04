import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Settings, Moon, Sun, Languages, Upload, Image as ImageIcon, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { DateFormatType } from '@/utils/dateFormat';

interface SettingsPanelProps {
  onBack: () => void;
}

export const SettingsPanel = ({ onBack }: SettingsPanelProps) => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dateFormat, setDateFormat] = useState<DateFormatType>('MM/DD/YYYY');

  useEffect(() => {
    checkAdminStatus();
    fetchSettings();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    setIsAdmin(!!data);
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('settings')
      .select('company_logo_url, app_logo_url, date_format')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();
    
    if (data) {
      if (data.company_logo_url) setCompanyLogoUrl(data.company_logo_url);
      if (data.app_logo_url) setAppLogoUrl(data.app_logo_url);
      if (data.date_format) setDateFormat(data.date_format as DateFormatType);
    }
  };

  const handleDateFormatChange = async (newFormat: DateFormatType) => {
    try {
      const { error } = await supabase
        .from('settings')
        .update({ date_format: newFormat })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) throw error;

      setDateFormat(newFormat);
      toast({
        title: "Success",
        description: "Date format updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>, logoType: 'app' | 'pdf') => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = logoType === 'app' ? `app-logo.${fileExt}` : `pdf-logo.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      // Update settings
      const updateField = logoType === 'app' ? 'app_logo_url' : 'company_logo_url';
      const { error: updateError } = await supabase
        .from('settings')
        .update({ [updateField]: publicUrl })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (updateError) throw updateError;

      if (logoType === 'app') {
        setAppLogoUrl(publicUrl);
      } else {
        setCompanyLogoUrl(publicUrl);
      }
      
      toast({
        title: "Success",
        description: `${logoType === 'app' ? 'App' : 'PDF'} logo updated successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/50 p-4 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('back')}
          </Button>
          <h1 className="text-xl font-bold text-foreground">{t('settings')}</h1>
        </div>
      </div>
      
      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {theme === 'light' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              {t('theme')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">
                  {theme === 'light' ? t('lightMode') : t('darkMode')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {theme === 'light' 
                    ? 'Switch to dark mode for better viewing in low light'
                    : 'Switch to light mode for better viewing in bright environments'
                  }
                </p>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
              />
            </div>
          </CardContent>
        </Card>

        {/* Language Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              {t('language')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label className="text-base">
                {t('language')}
              </Label>
              <Select value={language} onValueChange={(value: 'en' | 'sv') => setLanguage(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">🇺🇸 {t('english')}</SelectItem>
                  <SelectItem value="sv">🇸🇪 {t('swedish')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Date Format Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Date Format
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label className="text-base">
                Preferred Date Format
              </Label>
              <p className="text-sm text-muted-foreground">
                Choose how dates should be displayed throughout the app
              </p>
              <Select value={dateFormat} onValueChange={(value: DateFormatType) => handleDateFormatChange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US)</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (European)</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                  <SelectItem value="DD.MM.YYYY">DD.MM.YYYY (German)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Company Logo Settings - Admin Only */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Company Logos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* App Logo */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold">App Logo</h3>
                  </div>
                  {appLogoUrl && (
                    <div className="flex justify-center p-4 bg-muted rounded-lg">
                      <img 
                        src={appLogoUrl} 
                        alt="App Logo" 
                        className="max-h-32 max-w-full object-contain"
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="app-logo-upload" className="text-base mb-2 block">
                      Upload App Logo
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      This logo will appear in the app header and navigation
                    </p>
                    <Input
                      id="app-logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLogoUpload(e, 'app')}
                      disabled={uploading}
                    />
                  </div>
                </div>

                {/* PDF Logo */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold">PDF Export Logo</h3>
                  </div>
                  {companyLogoUrl && (
                    <div className="flex justify-center p-4 bg-muted rounded-lg">
                      <img 
                        src={companyLogoUrl} 
                        alt="PDF Logo" 
                        className="max-h-32 max-w-full object-contain"
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="pdf-logo-upload" className="text-base mb-2 block">
                      Upload PDF Logo
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      This logo will appear on exported PDF documents
                    </p>
                    <Input
                      id="pdf-logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLogoUpload(e, 'pdf')}
                      disabled={uploading}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
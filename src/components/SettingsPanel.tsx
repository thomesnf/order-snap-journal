import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Settings, Moon, Sun, Languages, Upload, Image as ImageIcon, Calendar, FileText, Trash2, GripVertical, Key, Download, Database, Palette } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import JSZip from 'jszip';
import { Input } from '@/components/ui/input';
import { DateFormatType } from '@/utils/dateFormat';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SettingsPanelProps {
  onBack: () => void;
}

export const SettingsPanel = ({ onBack }: SettingsPanelProps) => {
  const { mode, themeName, toggleMode, setThemeName, themes, addCustomTheme, removeCustomTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dateFormat, setDateFormat] = useState<DateFormatType>('MM/DD/YYYY');
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [customThemeDialogOpen, setCustomThemeDialogOpen] = useState(false);
  const [newTheme, setNewTheme] = useState({
    name: '',
    displayName: '',
    light: {
      primary: '219 70% 52%',
      primaryGlow: '219 70% 60%',
      accent: '34 100% 62%',
      accentForeground: '0 0% 100%',
    },
    dark: {
      primary: '210 40% 98%',
      primaryForeground: '222.2 47.4% 11.2%',
      accent: '217.2 32.6% 17.5%',
      accentForeground: '210 40% 98%',
    }
  });
  const [pdfSettings, setPdfSettings] = useState({
    primaryColor: '#2563eb',
    fontFamily: 'Arial, sans-serif',
    showLogo: true,
    logoMaxHeight: 80,
    pageMargin: 20,
    titleFontSize: 24,
  });
  
  interface PDFFieldConfig {
    field: string;
    label: string;
    visible: boolean;
    order: number;
    type?: 'field' | 'page_break' | 'line_break' | 'horizontal_line';
  }
  
  const [pdfFieldConfig, setPdfFieldConfig] = useState<PDFFieldConfig[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [backupHistory, setBackupHistory] = useState<any[]>([]);
  const [backupSchedule, setBackupSchedule] = useState({
    enabled: false,
    frequency: 'weekly' as 'daily' | 'weekly',
    day: 0,
    time: '02:00'
  });

  useEffect(() => {
    checkAdminStatus();
    fetchSettings();
    fetchBackupHistory();
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
      .select('company_logo_url, app_logo_url, date_format, pdf_primary_color, pdf_font_family, pdf_show_logo, pdf_logo_max_height, pdf_page_margin, pdf_field_config, pdf_title_font_size, backup_schedule_enabled, backup_schedule_frequency, backup_schedule_day, backup_schedule_time')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();
    
    if (data) {
      if (data.company_logo_url) setCompanyLogoUrl(data.company_logo_url);
      if (data.app_logo_url) setAppLogoUrl(data.app_logo_url);
      if (data.date_format) setDateFormat(data.date_format as DateFormatType);
      setPdfSettings({
        primaryColor: data.pdf_primary_color || '#2563eb',
        fontFamily: data.pdf_font_family || 'Arial, sans-serif',
        showLogo: data.pdf_show_logo !== false,
        logoMaxHeight: data.pdf_logo_max_height || 80,
        pageMargin: data.pdf_page_margin || 20,
        titleFontSize: data.pdf_title_font_size || 24,
      });
      if (data.pdf_field_config) {
        setPdfFieldConfig(data.pdf_field_config as unknown as PDFFieldConfig[]);
      }
      
      setBackupSchedule({
        enabled: data.backup_schedule_enabled ?? false,
        frequency: (data.backup_schedule_frequency as 'daily' | 'weekly') || 'weekly',
        day: data.backup_schedule_day ?? 0,
        time: data.backup_schedule_time || '02:00'
      });
    }
  };

  const fetchBackupHistory = async () => {
    const { data } = await supabase
      .from('backup_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (data) {
      setBackupHistory(data);
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

  const handlePdfSettingChange = async (field: string, value: string | number | boolean) => {
    try {
      const { error } = await supabase
        .from('settings')
        .update({ [`pdf_${field.replace(/([A-Z])/g, '_$1').toLowerCase()}`]: value })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) throw error;

      setPdfSettings(prev => ({ ...prev, [field]: value }));
      toast({
        title: "Success",
        description: "PDF layout setting updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFieldVisibilityChange = async (fieldName: string, visible: boolean) => {
    try {
      const updatedConfig = pdfFieldConfig.map(f => 
        f.field === fieldName ? { ...f, visible } : f
      );
      
      const { error } = await supabase
        .from('settings')
        .update({ pdf_field_config: updatedConfig as unknown as any })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) throw error;

      setPdfFieldConfig(updatedConfig);
      toast({
        title: "Success",
        description: "Field visibility updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    try {
      const oldIndex = pdfFieldConfig.findIndex((field) => field.field === active.id);
      const newIndex = pdfFieldConfig.findIndex((field) => field.field === over.id);

      const updatedConfig = arrayMove(pdfFieldConfig, oldIndex, newIndex);
      
      // Update order values
      updatedConfig.forEach((field, index) => {
        field.order = index + 1;
      });

      const { error } = await supabase
        .from('settings')
        .update({ pdf_field_config: updatedConfig as unknown as any })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) throw error;

      setPdfFieldConfig(updatedConfig);
      toast({
        title: "Success",
        description: "Field order updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addPageBreak = async (afterIndex: number) => {
    try {
      const updatedConfig = [...pdfFieldConfig];
      const newPageBreak: PDFFieldConfig = {
        field: `page_break_${Date.now()}`,
        label: 'Page Break',
        visible: true,
        order: afterIndex + 2,
        type: 'page_break'
      };
      
      updatedConfig.splice(afterIndex + 1, 0, newPageBreak);
      
      // Update order values
      updatedConfig.forEach((field, index) => {
        field.order = index + 1;
      });

      const { error } = await supabase
        .from('settings')
        .update({ pdf_field_config: updatedConfig as unknown as any })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) throw error;

      setPdfFieldConfig(updatedConfig);
      toast({
        title: "Success",
        description: "Page break added successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addLineBreak = async (afterIndex: number) => {
    try {
      const updatedConfig = [...pdfFieldConfig];
      const newLineBreak: PDFFieldConfig = {
        field: `line_break_${Date.now()}`,
        label: 'Line Break',
        visible: true,
        order: afterIndex + 2,
        type: 'line_break'
      };
      
      updatedConfig.splice(afterIndex + 1, 0, newLineBreak);
      
      updatedConfig.forEach((field, index) => {
        field.order = index + 1;
      });

      const { error } = await supabase
        .from('settings')
        .update({ pdf_field_config: updatedConfig as unknown as any })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) throw error;

      setPdfFieldConfig(updatedConfig);
      toast({
        title: "Success",
        description: "Line break added successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addHorizontalLine = async (afterIndex: number) => {
    try {
      const updatedConfig = [...pdfFieldConfig];
      const newHorizontalLine: PDFFieldConfig = {
        field: `horizontal_line_${Date.now()}`,
        label: 'Horizontal Line',
        visible: true,
        order: afterIndex + 2,
        type: 'horizontal_line'
      };
      
      updatedConfig.splice(afterIndex + 1, 0, newHorizontalLine);
      
      updatedConfig.forEach((field, index) => {
        field.order = index + 1;
      });

      const { error } = await supabase
        .from('settings')
        .update({ pdf_field_config: updatedConfig as unknown as any })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) throw error;

      setPdfFieldConfig(updatedConfig);
      toast({
        title: "Success",
        description: "Horizontal line added successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeField = async (fieldName: string) => {
    try {
      const updatedConfig = pdfFieldConfig.filter(f => f.field !== fieldName);
      
      // Update order values
      updatedConfig.forEach((field, index) => {
        field.order = index + 1;
      });

      const { error } = await supabase
        .from('settings')
        .update({ pdf_field_config: updatedConfig as unknown as any })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) throw error;

      setPdfFieldConfig(updatedConfig);
      toast({
        title: "Success",
        description: "Field removed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleBackup = async () => {
    try {
      setIsBackingUp(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      toast({
        title: "Starting backup",
        description: "This may take a while depending on the number of files...",
      });

      // Call the backup function
      const { data, error } = await supabase.functions.invoke('backup-database', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      // Create a zip file
      const zip = new JSZip();
      
      // Add the backup JSON
      const timestamp = new Date().toISOString().split('T')[0];
      zip.file(`backup-${timestamp}.json`, JSON.stringify(data, null, 2));

      // Download all storage files
      const storageData = data.storage as Record<string, any>;
      let downloadedCount = 0;
      let totalFiles = 0;

      // Count total files
      for (const bucketInfo of Object.values(storageData)) {
        if (bucketInfo.files && Array.isArray(bucketInfo.files)) {
          totalFiles += bucketInfo.files.length;
        }
      }

      if (totalFiles > 0) {
        toast({
          title: "Downloading files",
          description: `Downloading ${totalFiles} files from storage...`,
        });

        for (const [bucketName, bucketInfo] of Object.entries(storageData)) {
          if (bucketInfo.files && Array.isArray(bucketInfo.files)) {
            for (const filePath of bucketInfo.files) {
              try {
                // Use the edge function to download files (bypasses RLS for private buckets)
                const downloadUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-storage-file?bucket=${encodeURIComponent(bucketName)}&path=${encodeURIComponent(filePath)}`;
                
                const response = await fetch(downloadUrl, {
                  headers: {
                    Authorization: `Bearer ${session.access_token}`
                  }
                });

                if (!response.ok) {
                  console.error(`Error downloading ${bucketName}/${filePath}:`, response.statusText);
                  continue;
                }

                const fileBlob = await response.blob();
                zip.file(`storage/${bucketName}/${filePath}`, fileBlob);
                downloadedCount++;
                
                // Update progress every 10 files
                if (downloadedCount % 10 === 0) {
                  toast({
                    title: "Progress",
                    description: `Downloaded ${downloadedCount}/${totalFiles} files...`,
                  });
                }
              } catch (err) {
                console.error(`Error downloading ${bucketName}/${filePath}:`, err);
              }
            }
          }
        }
      }

      toast({
        title: "Creating zip file",
        description: "Packaging all files...",
      });

      // Generate the zip file
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      // Download the zip
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${timestamp}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: `Backup complete! Downloaded ${downloadedCount} files plus database backup.`,
      });
      
      // Refresh backup history
      fetchBackupHistory();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to create backup',
        variant: "destructive",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) {
      toast({
        title: "Error",
        description: "Please select a backup file first",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRestoring(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      toast({
        title: "Starting restore",
        description: "This may take a while depending on the backup size...",
      });

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('backup', restoreFile);

      // Call the restore function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/restore-database`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Restore failed');
      }

      const result = await response.json();

      toast({
        title: "Success",
        description: "Database and storage restored successfully!",
      });

      // Clear the file input
      setRestoreFile(null);
      
      // Optionally reload the page to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to restore backup',
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleScheduleUpdate = async (field: string, value: any) => {
    try {
      const updatedSchedule = { ...backupSchedule, [field]: value };
      
      const { error } = await supabase
        .from('settings')
        .update({
          [`backup_schedule_${field}`]: value
        })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) throw error;

      setBackupSchedule(updatedSchedule);
      
      toast({
        title: "Success",
        description: "Backup schedule updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteBackup = async (id: string) => {
    try {
      const { error } = await supabase
        .from('backup_history')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBackupHistory(backupHistory.filter(b => b.id !== id));
      
      toast({
        title: "Success",
        description: "Backup record deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  interface SortableFieldItemProps {
    field: PDFFieldConfig;
    onVisibilityChange: (fieldName: string, visible: boolean) => void;
    onRemove: (fieldName: string) => void;
  }

  const SortableFieldItem = ({ field, onVisibilityChange, onRemove }: SortableFieldItemProps) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: field.field });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-3 p-3 border rounded-lg bg-background"
      >
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        
        {field.type === 'page_break' || field.type === 'line_break' || field.type === 'horizontal_line' ? (
          <>
            <div className="flex-1 flex items-center gap-2 text-sm text-muted-foreground italic">
              <FileText className="h-4 w-4" />
              {field.label}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(field.field)}
              className="h-8 w-8 p-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Checkbox
              checked={field.visible}
              onCheckedChange={(checked) => onVisibilityChange(field.field, checked as boolean)}
            />
            <span className="flex-1 text-sm">{field.label}</span>
          </>
        )}
      </div>
    );
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
              {mode === 'light' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              {t('theme')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Light/Dark Mode Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">
                  {mode === 'light' ? t('lightMode') : t('darkMode')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {mode === 'light' 
                    ? 'Switch to dark mode for better viewing in low light'
                    : 'Switch to light mode for better viewing in bright environments'
                  }
                </p>
              </div>
              <Switch
                checked={mode === 'dark'}
                onCheckedChange={toggleMode}
              />
            </div>

            {/* Theme Palette Selection */}
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-base">Color Palette</Label>
              <p className="text-sm text-muted-foreground">
                Choose a color theme or create your own custom palette
              </p>
              <Select value={themeName} onValueChange={setThemeName}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {themes.map(theme => (
                    <SelectItem key={theme.name} value={theme.name}>
                      {theme.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => setCustomThemeDialogOpen(true)} 
                  variant="outline" 
                  className="flex-1"
                >
                  Create Custom Theme
                </Button>
                
                {themes.find(t => t.name === themeName && !['default', 'blue', 'red', 'pink'].includes(t.name)) && (
                  <Button 
                    onClick={() => {
                      removeCustomTheme(themeName);
                      toast({
                        title: "Success",
                        description: "Custom theme removed",
                      });
                    }} 
                    variant="destructive"
                    size="icon"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
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

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label className="text-base">
                Change Your Password
              </Label>
              <p className="text-sm text-muted-foreground">
                Update your password. Must be at least 6 characters long.
              </p>
              <Button onClick={() => setChangePasswordOpen(true)} className="w-full sm:w-auto">
                Change Password
              </Button>
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

        {/* Backup Settings - Admin Only */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Backup & Restore
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Backup Section */}
                <div className="space-y-3">
                  <Label className="text-base">
                    Backup Database & Storage
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Download a complete backup of your database and all storage files. The backup includes all tables data and file references.
                  </p>
                  <Button 
                    onClick={handleBackup} 
                    disabled={isBackingUp}
                    className="w-full sm:w-auto"
                  >
                    {isBackingUp ? (
                      <>Processing...</>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download Backup
                      </>
                    )}
                  </Button>
                </div>

                {/* Restore Section */}
                <div className="space-y-3 pt-6 border-t">
                  <Label className="text-base">
                    Restore from Backup
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Upload a backup .zip file to restore your database and storage. This will restore all data and files from the backup.
                  </p>
                  <div className="space-y-3">
                    <Input
                      type="file"
                      accept=".zip"
                      onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                      disabled={isRestoring}
                    />
                    <Button 
                      onClick={handleRestore} 
                      disabled={isRestoring || !restoreFile}
                      className="w-full sm:w-auto"
                      variant="secondary"
                    >
                      {isRestoring ? (
                        <>Restoring...</>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Restore Backup
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Backup Schedule Section */}
                <div className="space-y-4 pt-6 border-t">
                  <Label className="text-base">
                    Automatic Backup Schedule
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Configure automatic backups to run on a schedule. Backups are stored in the history below.
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <Label>Enable Scheduled Backups</Label>
                    <Switch
                      checked={backupSchedule.enabled}
                      onCheckedChange={(checked) => handleScheduleUpdate('enabled', checked)}
                    />
                  </div>

                  {backupSchedule.enabled && (
                    <div className="space-y-4 pl-4 border-l-2">
                      <div className="space-y-2">
                        <Label>Frequency</Label>
                        <Select 
                          value={backupSchedule.frequency} 
                          onValueChange={(value) => handleScheduleUpdate('frequency', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {backupSchedule.frequency === 'weekly' && (
                        <div className="space-y-2">
                          <Label>Day of Week</Label>
                          <Select 
                            value={backupSchedule.day.toString()} 
                            onValueChange={(value) => handleScheduleUpdate('day', parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Sunday</SelectItem>
                              <SelectItem value="1">Monday</SelectItem>
                              <SelectItem value="2">Tuesday</SelectItem>
                              <SelectItem value="3">Wednesday</SelectItem>
                              <SelectItem value="4">Thursday</SelectItem>
                              <SelectItem value="5">Friday</SelectItem>
                              <SelectItem value="6">Saturday</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Time (24-hour format)</Label>
                        <Input
                          type="time"
                          value={backupSchedule.time}
                          onChange={(e) => handleScheduleUpdate('time', e.target.value)}
                        />
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Note: After enabling scheduled backups, you'll need to configure the cron job. Contact support or check documentation for setup instructions.
                      </p>
                    </div>
                  )}
                </div>

                {/* Backup History Section */}
                <div className="space-y-4 pt-6 border-t">
                  <Label className="text-base">
                    Backup History
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    View and manage previous backups
                  </p>
                  
                  {backupHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No backups yet</p>
                  ) : (
                    <div className="space-y-2">
                      {backupHistory.map((backup) => (
                        <div 
                          key={backup.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {backup.backup_type === 'manual' ? '📥 Manual' : '⏰ Scheduled'} Backup
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(backup.created_at)} • {formatFileSize(backup.file_size)}
                            </p>
                            {backup.notes && (
                              <p className="text-xs text-muted-foreground mt-1">{backup.notes}</p>
                            )}
                            <p className="text-xs">
                              Status: <span className={backup.status === 'completed' ? 'text-green-600' : 'text-red-600'}>
                                {backup.status}
                              </span>
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteBackup(backup.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PDF Layout Settings - Admin Only */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                PDF Export Layout
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Primary Color */}
                <div className="space-y-3">
                  <Label htmlFor="pdf-primary-color" className="text-base">
                    Primary Color
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Color used for headings and borders in PDF exports
                  </p>
                  <div className="flex gap-3 items-center">
                    <Input
                      id="pdf-primary-color"
                      type="color"
                      value={pdfSettings.primaryColor}
                      onChange={(e) => handlePdfSettingChange('primaryColor', e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={pdfSettings.primaryColor}
                      onChange={(e) => handlePdfSettingChange('primaryColor', e.target.value)}
                      className="flex-1"
                      placeholder="#2563eb"
                    />
                  </div>
                </div>

                {/* Font Family */}
                <div className="space-y-3">
                  <Label htmlFor="pdf-font-family" className="text-base">
                    Font Family
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Font used throughout PDF documents
                  </p>
                  <Select 
                    value={pdfSettings.fontFamily} 
                    onValueChange={(value) => handlePdfSettingChange('fontFamily', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                      <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                      <SelectItem value="'Courier New', monospace">Courier New</SelectItem>
                      <SelectItem value="Georgia, serif">Georgia</SelectItem>
                      <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Show Logo */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Show Logo in PDFs</Label>
                    <p className="text-sm text-muted-foreground">
                      Display company logo in exported PDFs
                    </p>
                  </div>
                  <Switch
                    checked={pdfSettings.showLogo}
                    onCheckedChange={(checked) => handlePdfSettingChange('showLogo', checked)}
                  />
                </div>

                {/* Logo Max Height */}
                <div className="space-y-3">
                  <Label htmlFor="pdf-logo-height" className="text-base">
                    Logo Maximum Height (px)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Maximum height for the logo in PDF exports
                  </p>
                  <Input
                    id="pdf-logo-height"
                    type="number"
                    min="40"
                    max="200"
                    value={pdfSettings.logoMaxHeight}
                    onChange={(e) => handlePdfSettingChange('logoMaxHeight', parseInt(e.target.value))}
                  />
                </div>

                {/* Page Margin */}
                <div className="space-y-3">
                  <Label htmlFor="pdf-page-margin" className="text-base">
                    Page Margin (px)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Margin around the content in PDF exports
                  </p>
                  <Input
                    id="pdf-page-margin"
                    type="number"
                    min="0"
                    max="100"
                    value={pdfSettings.pageMargin}
                    onChange={(e) => handlePdfSettingChange('pageMargin', parseInt(e.target.value))}
                  />
                </div>

                {/* Title Font Size */}
                <div className="space-y-3">
                  <Label htmlFor="pdf-title-font-size" className="text-base">
                    Title Font Size (px)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Font size for the main title in PDF exports
                  </p>
                  <Input
                    id="pdf-title-font-size"
                    type="number"
                    min="12"
                    max="72"
                    value={pdfSettings.titleFontSize}
                    onChange={(e) => handlePdfSettingChange('titleFontSize', parseInt(e.target.value))}
                  />
                </div>

                {/* Field Configuration */}
                <div className="space-y-3">
                  <div className="border-t pt-6">
                    <Label className="text-base">PDF Field Configuration</Label>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">
                      Choose which fields to show in PDF exports and reorder them
                    </p>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={pdfFieldConfig.map(f => f.field)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {pdfFieldConfig.map((field) => (
                            <SortableFieldItem
                              key={field.field}
                              field={field}
                              onVisibilityChange={handleFieldVisibilityChange}
                              onRemove={removeField}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addPageBreak(pdfFieldConfig.length - 1)}
                        className="flex-1 text-xs"
                      >
                        + Add Page Break
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addLineBreak(pdfFieldConfig.length - 1)}
                        className="flex-1 text-xs"
                      >
                        + Add Line Break
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addHorizontalLine(pdfFieldConfig.length - 1)}
                        className="flex-1 text-xs"
                      >
                        + Add Horizontal Line
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />

      {/* Custom Theme Creator Dialog */}
      <Dialog open={customThemeDialogOpen} onOpenChange={setCustomThemeDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background z-50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Create Custom Theme
            </DialogTitle>
            <DialogDescription>
              Define your own color palette with separate light and dark mode colors (HSL format)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Theme Name */}
            <div className="space-y-2">
              <Label htmlFor="theme-name">Theme Name (ID)</Label>
              <Input
                id="theme-name"
                placeholder="e.g., ocean, sunset, forest"
                value={newTheme.name}
                onChange={(e) => setNewTheme({ ...newTheme, name: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme-display-name">Display Name</Label>
              <Input
                id="theme-display-name"
                placeholder="e.g., Ocean Theme, Sunset, Forest Green"
                value={newTheme.displayName}
                onChange={(e) => setNewTheme({ ...newTheme, displayName: e.target.value })}
              />
            </div>

            {/* Light Mode Colors */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold">Light Mode Colors</h3>
              <p className="text-sm text-muted-foreground">Use HSL format: "hue saturation% lightness%"</p>
              
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label htmlFor="light-primary">Primary Color</Label>
                  <Input
                    id="light-primary"
                    placeholder="219 70% 52%"
                    value={newTheme.light.primary}
                    onChange={(e) => setNewTheme({ ...newTheme, light: { ...newTheme.light, primary: e.target.value } })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="light-primary-glow">Primary Glow</Label>
                  <Input
                    id="light-primary-glow"
                    placeholder="219 70% 60%"
                    value={newTheme.light.primaryGlow}
                    onChange={(e) => setNewTheme({ ...newTheme, light: { ...newTheme.light, primaryGlow: e.target.value } })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="light-accent">Accent Color</Label>
                  <Input
                    id="light-accent"
                    placeholder="34 100% 62%"
                    value={newTheme.light.accent}
                    onChange={(e) => setNewTheme({ ...newTheme, light: { ...newTheme.light, accent: e.target.value } })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="light-accent-fg">Accent Foreground</Label>
                  <Input
                    id="light-accent-fg"
                    placeholder="0 0% 100%"
                    value={newTheme.light.accentForeground}
                    onChange={(e) => setNewTheme({ ...newTheme, light: { ...newTheme.light, accentForeground: e.target.value } })}
                  />
                </div>
              </div>
            </div>

            {/* Dark Mode Colors */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold">Dark Mode Colors</h3>
              <p className="text-sm text-muted-foreground">Use HSL format: "hue saturation% lightness%"</p>
              
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label htmlFor="dark-primary">Primary Color</Label>
                  <Input
                    id="dark-primary"
                    placeholder="210 40% 98%"
                    value={newTheme.dark.primary}
                    onChange={(e) => setNewTheme({ ...newTheme, dark: { ...newTheme.dark, primary: e.target.value } })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="dark-primary-fg">Primary Foreground</Label>
                  <Input
                    id="dark-primary-fg"
                    placeholder="222.2 47.4% 11.2%"
                    value={newTheme.dark.primaryForeground}
                    onChange={(e) => setNewTheme({ ...newTheme, dark: { ...newTheme.dark, primaryForeground: e.target.value } })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="dark-accent">Accent Color</Label>
                  <Input
                    id="dark-accent"
                    placeholder="217.2 32.6% 17.5%"
                    value={newTheme.dark.accent}
                    onChange={(e) => setNewTheme({ ...newTheme, dark: { ...newTheme.dark, accent: e.target.value } })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="dark-accent-fg">Accent Foreground</Label>
                  <Input
                    id="dark-accent-fg"
                    placeholder="210 40% 98%"
                    value={newTheme.dark.accentForeground}
                    onChange={(e) => setNewTheme({ ...newTheme, dark: { ...newTheme.dark, accentForeground: e.target.value } })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomThemeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (!newTheme.name || !newTheme.displayName) {
                toast({
                  title: "Error",
                  description: "Please provide both theme name and display name",
                  variant: "destructive",
                });
                return;
              }
              
              addCustomTheme(newTheme);
              setThemeName(newTheme.name);
              setCustomThemeDialogOpen(false);
              
              // Reset form
              setNewTheme({
                name: '',
                displayName: '',
                light: {
                  primary: '219 70% 52%',
                  primaryGlow: '219 70% 60%',
                  accent: '34 100% 62%',
                  accentForeground: '0 0% 100%',
                },
                dark: {
                  primary: '210 40% 98%',
                  primaryForeground: '222.2 47.4% 11.2%',
                  accent: '217.2 32.6% 17.5%',
                  accentForeground: '210 40% 98%',
                }
              });
              
              toast({
                title: "Success",
                description: "Custom theme created successfully",
              });
            }}>
              Create Theme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
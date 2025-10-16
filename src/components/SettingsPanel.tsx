import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Settings, Moon, Sun, Languages, Upload, Image as ImageIcon, Calendar, FileText, Trash2, GripVertical, Key } from 'lucide-react';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dateFormat, setDateFormat] = useState<DateFormatType>('MM/DD/YYYY');
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
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
      .select('company_logo_url, app_logo_url, date_format, pdf_primary_color, pdf_font_family, pdf_show_logo, pdf_logo_max_height, pdf_page_margin, pdf_field_config, pdf_title_font_size')
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
    </div>
  );
};
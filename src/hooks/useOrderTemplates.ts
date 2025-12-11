import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

export interface OrderTemplateStage {
  name: string;
  description?: string;
}

export interface OrderTemplate {
  id: string;
  name: string;
  description: string | null;
  default_title: string | null;
  default_description: string | null;
  default_priority: 'low' | 'medium' | 'high';
  default_status: 'pending' | 'in-progress' | 'completed' | 'cancelled' | 'invoiced' | 'paid';
  default_stages: OrderTemplateStage[];
  default_summary: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreateTemplateData {
  name: string;
  description?: string;
  default_title?: string;
  default_description?: string;
  default_priority?: 'low' | 'medium' | 'high';
  default_status?: 'pending' | 'in-progress' | 'completed' | 'cancelled' | 'invoiced' | 'paid';
  default_stages?: OrderTemplateStage[];
  default_summary?: string;
}

export const useOrderTemplates = () => {
  const [templates, setTemplates] = useState<OrderTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('order_templates')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      
      // Parse stages JSON and cast types properly
      const parsedTemplates: OrderTemplate[] = (data || []).map(template => {
        const stages = template.default_stages;
        let parsedStages: OrderTemplateStage[] = [];
        
        if (Array.isArray(stages)) {
          parsedStages = stages.map((s: any) => ({
            name: s?.name || '',
            description: s?.description
          }));
        }
        
        return {
          id: template.id,
          name: template.name,
          description: template.description,
          default_title: template.default_title,
          default_description: template.default_description,
          default_priority: template.default_priority as 'low' | 'medium' | 'high',
          default_status: template.default_status as OrderTemplate['default_status'],
          default_stages: parsedStages,
          default_summary: template.default_summary,
          created_at: template.created_at,
          updated_at: template.updated_at,
          created_by: template.created_by
        };
      });
      
      setTemplates(parsedTemplates);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (data: CreateTemplateData) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { data: newTemplate, error } = await supabase
        .from('order_templates')
        .insert({
          name: data.name,
          description: data.description || null,
          default_title: data.default_title || null,
          default_description: data.default_description || null,
          default_priority: data.default_priority || 'medium',
          default_status: data.default_status || 'pending',
          default_stages: (data.default_stages || []) as unknown as Json,
          default_summary: data.default_summary || null,
          created_by: user.user?.id || null
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchTemplates();
      return newTemplate;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateTemplate = async (id: string, data: Partial<CreateTemplateData>) => {
    try {
      const updateData: Record<string, any> = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.default_title !== undefined) updateData.default_title = data.default_title;
      if (data.default_description !== undefined) updateData.default_description = data.default_description;
      if (data.default_priority !== undefined) updateData.default_priority = data.default_priority;
      if (data.default_status !== undefined) updateData.default_status = data.default_status;
      if (data.default_stages !== undefined) updateData.default_stages = data.default_stages as unknown as Json;
      if (data.default_summary !== undefined) updateData.default_summary = data.default_summary;

      const { error } = await supabase
        .from('order_templates')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      await fetchTemplates();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('order_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchTemplates();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate
  };
};

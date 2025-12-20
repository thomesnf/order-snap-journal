import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FileCollection {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  expires_at: string;
}

export interface CollectionFile {
  id: string;
  collection_id: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
}

export interface CollectionShareToken {
  id: string;
  collection_id: string;
  token: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}

export const useFileCollections = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchCollections = async (): Promise<FileCollection[]> => {
    const { data, error } = await supabase
      .from('file_collections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching collections:', error);
      return [];
    }

    return data || [];
  };

  const fetchCollectionFiles = async (collectionId: string): Promise<CollectionFile[]> => {
    const { data, error } = await supabase
      .from('collection_files')
      .select('*')
      .eq('collection_id', collectionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching files:', error);
      return [];
    }

    return data || [];
  };

  const createCollection = async (
    name: string,
    description: string | null,
    expiresInDays: number
  ): Promise<FileCollection | null> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const { data, error } = await supabase
        .from('file_collections')
        .insert({
          name,
          description,
          created_by: user.id,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Collection created successfully',
      });

      return data;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteCollection = async (collectionId: string): Promise<boolean> => {
    setLoading(true);
    try {
      // First, get all files to delete from storage
      const files = await fetchCollectionFiles(collectionId);
      
      // Delete files from storage
      if (files.length > 0) {
        const filePaths = files.map(f => f.file_path);
        await supabase.storage.from('customer-deliverables').remove(filePaths);
      }

      // Delete the collection (cascade will delete files and tokens)
      const { error } = await supabase
        .from('file_collections')
        .delete()
        .eq('id', collectionId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Collection deleted successfully',
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const uploadFiles = async (
    collectionId: string,
    files: File[]
  ): Promise<CollectionFile[]> => {
    setLoading(true);
    const uploadedFiles: CollectionFile[] = [];

    try {
      for (const file of files) {
        const filePath = `${collectionId}/${Date.now()}-${file.name}`;
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('customer-deliverables')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Create database record
        const { data, error: dbError } = await supabase
          .from('collection_files')
          .insert({
            collection_id: collectionId,
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
          })
          .select()
          .single();

        if (dbError) throw dbError;

        uploadedFiles.push(data);
      }

      toast({
        title: 'Success',
        description: `${files.length} file(s) uploaded successfully`,
      });

      return uploadedFiles;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return uploadedFiles;
    } finally {
      setLoading(false);
    }
  };

  const deleteFile = async (file: CollectionFile): Promise<boolean> => {
    setLoading(true);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('customer-deliverables')
        .remove([file.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('collection_files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      toast({
        title: 'Success',
        description: 'File deleted successfully',
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const createShareLink = async (
    collectionId: string,
    expiresInDays: number
  ): Promise<CollectionShareToken | null> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const { data, error } = await supabase
        .from('collection_share_tokens')
        .insert({
          collection_id: collectionId,
          created_by: user.id,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Share link created successfully',
      });

      return data;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const revokeShareLink = async (tokenId: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('collection_share_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', tokenId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Share link revoked successfully',
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getActiveShareLinks = async (collectionId: string): Promise<CollectionShareToken[]> => {
    const { data, error } = await supabase
      .from('collection_share_tokens')
      .select('*')
      .eq('collection_id', collectionId)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching share links:', error);
      return [];
    }

    return data || [];
  };

  const getCollectionByToken = async (token: string): Promise<{
    collection: FileCollection | null;
    files: CollectionFile[];
    isValid: boolean;
  }> => {
    // First, validate the token
    const { data: tokenData, error: tokenError } = await supabase
      .from('collection_share_tokens')
      .select('*')
      .eq('token', token)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      return { collection: null, files: [], isValid: false };
    }

    // Get the collection
    const { data: collection, error: collectionError } = await supabase
      .from('file_collections')
      .select('*')
      .eq('id', tokenData.collection_id)
      .single();

    if (collectionError || !collection) {
      return { collection: null, files: [], isValid: false };
    }

    // Get the files
    const { data: files, error: filesError } = await supabase
      .from('collection_files')
      .select('*')
      .eq('collection_id', tokenData.collection_id)
      .order('created_at', { ascending: true });

    if (filesError) {
      return { collection, files: [], isValid: true };
    }

    return { collection, files: files || [], isValid: true };
  };

  const getFileUrl = (filePath: string): string => {
    const { data } = supabase.storage
      .from('customer-deliverables')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  return {
    loading,
    fetchCollections,
    fetchCollectionFiles,
    createCollection,
    deleteCollection,
    uploadFiles,
    deleteFile,
    createShareLink,
    revokeShareLink,
    getActiveShareLinks,
    getCollectionByToken,
    getFileUrl,
  };
};

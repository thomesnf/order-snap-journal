import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders } from '../_shared/cors.ts';
import JSZip from 'https://esm.sh/jszip@3.10.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'admin') {
      throw new Error('Only admins can restore backups');
    }

    // Get the uploaded file
    const formData = await req.formData();
    const backupFile = formData.get('backup') as File;
    
    if (!backupFile) {
      throw new Error('No backup file provided');
    }

    // Read the zip file
    const arrayBuffer = await backupFile.arrayBuffer();
    
    // Extract backup.json from zip
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    let backupData: any = null;
    const storageFiles: { path: string; data: Uint8Array; bucket: string }[] = [];

    for (const [filename, file] of Object.entries(zip.files)) {
      if ((file as any).dir) continue; // Skip directories
      
      if (filename === 'backup.json') {
        const text = await (file as any).async('text');
        backupData = JSON.parse(text);
      } else if (filename.startsWith('storage/')) {
        const data = await (file as any).async('uint8array');
        const pathParts = filename.split('/');
        const bucket = pathParts[1];
        const filePath = pathParts.slice(2).join('/');
        storageFiles.push({ path: filePath, data, bucket });
      }
    }

    if (!backupData) {
      throw new Error('No backup.json found in zip file');
    }

    console.log(`Restoring backup from ${backupData.timestamp}`);
    console.log(`Found ${storageFiles.length} storage files to restore`);

    // Restore database tables (skip system tables and user_roles/profiles for safety)
    const tablesToRestore = [
      'customers',
      'orders',
      'order_stages',
      'order_assignments',
      'time_entries',
      'journal_entries',
      'summary_entries',
      'photos',
      'share_tokens',
      'settings'
    ];

    const results: Record<string, any> = {
      tables: {},
      storage: {}
    };

    for (const table of tablesToRestore) {
      if (backupData.tables[table] && !backupData.tables[table].error) {
        const rows = backupData.tables[table];
        
        if (rows.length > 0) {
          // Insert data in batches of 100
          const batchSize = 100;
          let inserted = 0;
          
          for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            const { error } = await supabase
              .from(table)
              .upsert(batch, { onConflict: 'id' });
            
            if (error) {
              console.error(`Error restoring ${table}:`, error);
              results.tables[table] = { error: error.message, inserted };
            } else {
              inserted += batch.length;
            }
          }
          
          results.tables[table] = { restored: inserted };
        } else {
          results.tables[table] = { restored: 0 };
        }
      }
    }

    // Restore storage files
    for (const { path, data, bucket } of storageFiles) {
      const { error } = await supabase
        .storage
        .from(bucket)
        .upload(path, data, {
          upsert: true,
          contentType: 'application/octet-stream'
        });
      
      if (error) {
        console.error(`Error restoring file ${bucket}/${path}:`, error);
        if (!results.storage[bucket]) results.storage[bucket] = [];
        results.storage[bucket].push({ path, error: error.message });
      } else {
        if (!results.storage[bucket]) results.storage[bucket] = [];
        results.storage[bucket].push({ path, success: true });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Backup restored successfully',
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Restore error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

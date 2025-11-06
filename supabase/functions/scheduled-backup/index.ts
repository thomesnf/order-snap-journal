import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting scheduled backup...');

    // Check if scheduled backups are enabled
    const { data: settings } = await supabase
      .from('settings')
      .select('backup_schedule_enabled')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    if (!settings?.backup_schedule_enabled) {
      console.log('Scheduled backups are disabled');
      return new Response(
        JSON.stringify({ message: 'Scheduled backups are disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Export all tables
    const tables = [
      'profiles',
      'user_roles',
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

    const backup: Record<string, any> = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      tables: {}
    };

    // Export each table
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*');
      
      if (error) {
        console.error(`Error exporting ${table}:`, error);
        backup.tables[table] = { error: error.message };
      } else {
        backup.tables[table] = data;
      }
    }

    // List storage files
    const buckets = ['company-assets', 'order-basis'];
    backup.storage = {};

    for (const bucket of buckets) {
      const allFiles: string[] = [];
      
      async function listFilesRecursive(path: string) {
        const { data: items } = await supabase
          .storage
          .from(bucket)
          .list(path, { limit: 1000 });

        if (items) {
          for (const item of items) {
            const fullPath = path ? `${path}/${item.name}` : item.name;
            
            if (item.id) {
              allFiles.push(fullPath);
            } else {
              await listFilesRecursive(fullPath);
            }
          }
        }
      }

      await listFilesRecursive('');
      
      console.log(`Found ${allFiles.length} files in ${bucket}`);
      
      backup.storage[bucket] = {
        bucket_name: bucket,
        file_count: allFiles.length,
        files: allFiles,
        download_note: 'Use the file paths to download from storage'
      };
    }

    const backupJson = JSON.stringify(backup, null, 2);
    const fileSize = new Blob([backupJson]).size;

    // Record backup in history
    const { error: historyError } = await supabase
      .from('backup_history')
      .insert({
        file_size: fileSize,
        status: 'completed',
        backup_type: 'scheduled',
        notes: `Scheduled backup with ${Object.keys(backup.tables).length} tables and ${Object.keys(backup.storage || {}).length} storage buckets`
      });

    if (historyError) {
      console.error('Error recording backup history:', historyError);
    }

    console.log('Scheduled backup completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Backup completed successfully',
        fileSize,
        timestamp: backup.timestamp
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scheduled backup error:', error);
    
    // Record failed backup in history
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await supabase
      .from('backup_history')
      .insert({
        status: 'failed',
        backup_type: 'scheduled',
        notes: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });

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

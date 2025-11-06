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
      throw new Error('Only admins can perform backups');
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
      const { data: files, error } = await supabase
        .storage
        .from(bucket)
        .list('', {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (error) {
        console.error(`Error listing ${bucket}:`, error);
        backup.storage[bucket] = { error: error.message };
      } else {
        // Get all file paths recursively
        const allFiles: string[] = [];
        
        async function listFilesRecursive(path: string) {
          const { data: items } = await supabase
            .storage
            .from(bucket)
            .list(path, { limit: 1000 });

          if (items) {
            for (const item of items) {
              const fullPath = path ? `${path}/${item.name}` : item.name;
              
              // If item has an id, it's a file
              if (item.id) {
                allFiles.push(fullPath);
              } else {
                // If no id, it's a folder - recurse into it
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
    }

    // Return the backup as JSON
    const backupJson = JSON.stringify(backup, null, 2);
    
    return new Response(backupJson, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="backup-${new Date().toISOString()}.json"`
      }
    });

  } catch (error) {
    console.error('Backup error:', error);
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

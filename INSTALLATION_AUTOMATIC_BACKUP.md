# Automatic Backup Setup Guide

This guide will help you set up automatic scheduled backups for your Order Management System.

## Prerequisites

- You must have admin access to your Supabase project
- Your Supabase project must support pg_cron and pg_net extensions
- The `scheduled-backup` edge function must be deployed

## Step-by-Step Setup

### Step 1: Enable Required Extensions

First, you need to enable the `pg_cron` and `pg_net` extensions in your database.

1. Open your Lovable Cloud backend (Cloud tab → Database)
2. Run the following SQL commands:

```sql
-- Enable pg_cron extension for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Step 2: Configure the Scheduled Backup Job

Now you'll set up the cron job that runs the backup automatically.

Run this SQL command (adjust the schedule if needed):

```sql
-- Schedule automatic backup every Sunday at 2:00 AM
SELECT cron.schedule(
  'scheduled-backup-job',
  '0 2 * * 0',  -- Cron expression: Sunday at 2:00 AM
  $$
  SELECT net.http_post(
    url := 'https://dwhzsixwssldezzdtxjp.supabase.co/functions/v1/scheduled-backup',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3aHpzaXh3c3NsZGV6emR0eGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjYxMzksImV4cCI6MjA3NDgwMjEzOX0.br-wn3_Ioz9gVWF9EDi_PKW7r1WvQwyVHJTgKTdMfVo"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

### Step 3: Configure Backup Schedule in Settings

1. Log in to your application as an admin user
2. Navigate to the Settings page
3. Scroll down to "Database Backup & Restore" section
4. Under "Automatic Backup Schedule":
   - Toggle "Enable Automatic Backups" to ON
   - Select your preferred frequency (Daily or Weekly)
   - If Weekly: Choose the day of the week
   - Set the time for the backup to run
5. Click "Update Schedule"

### Step 4: Verify the Setup

To verify that your scheduled backup is configured correctly:

```sql
-- View all scheduled cron jobs
SELECT * FROM cron.job;

-- You should see 'scheduled-backup-job' in the list
```

## Cron Schedule Syntax

If you want to customize the backup schedule, here's how to modify the cron expression:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of the month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of the week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

### Common Schedules:

- **Daily at 2:00 AM**: `0 2 * * *`
- **Every Sunday at 2:00 AM**: `0 2 * * 0`
- **Every Monday at 3:00 AM**: `0 3 * * 1`
- **Daily at midnight**: `0 0 * * *`
- **Every 6 hours**: `0 */6 * * *`

## Modifying the Schedule

To change the backup schedule:

```sql
-- First, unschedule the existing job
SELECT cron.unschedule('scheduled-backup-job');

-- Then create a new schedule with your preferred timing
SELECT cron.schedule(
  'scheduled-backup-job',
  '0 3 * * *',  -- New schedule: Daily at 3:00 AM
  $$
  SELECT net.http_post(
    url := 'https://dwhzsixwssldezzdtxjp.supabase.co/functions/v1/scheduled-backup',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3aHpzaXh3c3NsZGV6emR0eGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjYxMzksImV4cCI6MjA3NDgwMjEzOX0.br-wn3_Ioz9gVWF9EDi_PKW7r1WvQwyVHJTgKTdMfVo"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

## Monitoring Backups

You can monitor your backups in two ways:

1. **In the Application**:
   - Go to Settings → Database Backup & Restore → Backup History
   - View all manual and scheduled backups with timestamps and file sizes

2. **In the Database**:
   ```sql
   -- View recent backups
   SELECT * FROM backup_history 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

## Troubleshooting

### Backups Not Running

1. Verify the cron job exists:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'scheduled-backup-job';
   ```

2. Check cron job history:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'scheduled-backup-job')
   ORDER BY start_time DESC 
   LIMIT 10;
   ```

3. Verify the edge function is deployed and accessible

### Disabling Automatic Backups

To completely disable automatic backups:

```sql
-- Remove the scheduled job
SELECT cron.unschedule('scheduled-backup-job');
```

Or simply toggle off "Enable Automatic Backups" in the Settings page.

## Support

For issues or questions, please check the application logs or contact support.

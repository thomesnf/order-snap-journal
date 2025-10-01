# Admin User Setup Guide

This application uses admin-only user management. Public registration is **disabled** for security.

## Initial Admin Setup

### Step 1: Access Backend Dashboard

Open your Lovable Cloud backend to create the first admin user manually.

### Step 2: Create Admin Account

1. Go to **Authentication → Users**
2. Click **"Add User"**
3. Fill in:
   - Email: `admin@localhost` (or your email)
   - Password: Choose a secure password
   - Enable **Auto Confirm User**
4. Click **Save**
5. **Copy the User ID** from the created user

### Step 3: Grant Admin Role

1. Go to **Table Editor → user_roles**
2. Click **Insert → Insert row**
3. Fill in:
   - **user_id**: Paste the User ID from Step 2
   - **role**: Select `admin`
4. Click **Save**

✅ You can now log in with your admin credentials!

## Managing Users (Admin Panel)

Once logged in as admin, access the **Admin Panel** via the shield icon (🛡️) in the navigation.

### Creating New Users

**Option 1: Through Backend** (Recommended for first users)
- Same process as creating the admin (Steps 2-3 above)
- Don't grant admin role unless needed

**Option 2: Through Backend + Admin Panel**
1. Create user via backend (Step 2 only)
2. Use Admin Panel to grant admin role if needed

### Managing Roles

In the Admin Panel you can:
- ✅ Grant admin privileges
- ✅ Remove admin privileges
- ✅ View all users and their roles

## Permission Levels

### Admin Users Can:
- Create orders
- Update orders
- **Delete orders** (soft delete with backup)
- **Restore deleted orders**
- Create and manage users
- Access Admin Panel

### Regular Users Can:
- Create orders
- Update own orders
- Add journal entries
- Upload photos
- **Cannot delete orders**

## Security Best Practices

⚠️ **Important:**
- Change default passwords immediately
- Only grant admin to trusted users
- Regularly review user roles
- Deleted orders can be restored by admins
- All deletions are logged (deleted_by field)

## Docker Self-Hosting

When self-hosting with Docker, you'll need to:
1. Set up your Supabase instance
2. Create admin user through Supabase dashboard
3. Configure environment variables in `.env`

See `README.Docker.md` for deployment instructions.

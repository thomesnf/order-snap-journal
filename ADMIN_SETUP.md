# Admin User Setup Guide

This application uses admin-only user creation. Follow these steps to create your first admin user:

## Step 1: Create the Admin User via Backend

1. Open your Lovable Cloud backend by clicking "View Backend" in the chat
2. Go to Authentication → Users
3. Click "Add User" or "Create New User"
4. Enter the following details:
   - Email: `admin@yourcompany.com` (or your preferred admin email)
   - Password: Choose a secure password
   - Email Confirmed: Check this box
5. Click "Create User"
6. Copy the User ID that appears (looks like: `550e8400-e29b-41d4-a716-446655440000`)

## Step 2: Grant Admin Role

1. In the backend, go to SQL Editor
2. Run this SQL command (replace `YOUR_USER_ID` with the ID you copied):

```sql
-- Insert profile for the admin user
INSERT INTO public.profiles (id, full_name)
VALUES ('YOUR_USER_ID', 'System Administrator')
ON CONFLICT (id) DO NOTHING;

-- Grant admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_USER_ID', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

3. Click "Run" to execute

## Step 3: Login and Create More Users

1. Go to your app and login with the admin credentials
2. You'll now see an "Admin" button in the top right (gear icon menu)
3. Click it to access the User Management panel
4. From there you can:
   - View all users
   - Grant or remove admin privileges
   - Create new users by first creating them via the backend, then managing their roles

## Security Notes

- **Change the default password immediately** after first login
- Only admins can delete orders (soft delete with backup)
- Only admins can restore deleted orders
- Only admins can manage user roles
- Regular users can create and manage their own orders

## Docker Deployment

When deploying with Docker (see `README.Docker.md`), make sure to:
1. Set up your admin user before deploying
2. Use environment variables for database credentials
3. Configure automatic backups in your Docker setup
4. Secure your server with proper firewall rules

## Troubleshooting

**Can't see the Admin panel?**
- Make sure you ran the SQL command to grant admin role
- Log out and log back in to refresh your session

**Created a user but they can't login?**
- Make sure "Email Confirmed" was checked when creating the user
- Or enable "Auto-confirm emails" in Authentication Settings

**Need to revoke admin access?**
- Go to SQL Editor and run:
```sql
DELETE FROM public.user_roles 
WHERE user_id = 'USER_ID_HERE' AND role = 'admin';
```

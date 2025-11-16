-- Promote a user to admin role
-- Replace 'USER_EMAIL_HERE' with the actual email address of the user you want to promote

-- First, find the user ID
SELECT id, email FROM auth.users WHERE email = 'USER_EMAIL_HERE';

-- Then assign admin role (replace the UUID with the actual user ID from above)
INSERT INTO public.user_roles (user_id, role) 
VALUES ('USER_ID_HERE', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the role was assigned
SELECT u.email, ur.role 
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'USER_EMAIL_HERE';

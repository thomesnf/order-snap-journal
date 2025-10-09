import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schemas
const emailSchema = z.string().email().max(255)
const passwordSchema = z.string().min(8).max(72).regex(
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
  'Password must contain at least one uppercase letter, one lowercase letter, and one number'
)
const fullNameSchema = z.string().trim().min(1).max(100).regex(
  /^[a-zA-ZäöåÄÖÅ\s-']+$/,
  'Full name can only contain letters, spaces, hyphens, and apostrophes'
)
const uuidSchema = z.string().uuid()

const createUserSchema = z.object({
  action: z.literal('createUser'),
  email: emailSchema,
  password: passwordSchema,
  fullName: fullNameSchema,
})

const updateUserSchema = z.object({
  action: z.literal('updateUser'),
  userId: uuidSchema,
  email: emailSchema,
  fullName: fullNameSchema,
})

const updatePasswordSchema = z.object({
  action: z.literal('updatePassword'),
  userId: uuidSchema,
  password: passwordSchema,
})

const deleteUserSchema = z.object({
  action: z.literal('deleteUser'),
  userId: uuidSchema,
})

const listUsersSchema = z.object({
  action: z.literal('listUsers'),
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create a client with the user's token to verify they're authenticated
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify the user is authenticated and is an admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (roleError || !roleData) {
      throw new Error('User is not an admin')
    }

    const body = await req.json()
    
    // Validate input based on action type
    let validatedData
    try {
      switch (body.action) {
        case 'createUser':
          validatedData = createUserSchema.parse(body)
          break
        case 'updateUser':
          validatedData = updateUserSchema.parse(body)
          break
        case 'updatePassword':
          validatedData = updatePasswordSchema.parse(body)
          break
        case 'deleteUser':
          validatedData = deleteUserSchema.parse(body)
          break
        case 'listUsers':
          validatedData = listUsersSchema.parse(body)
          break
        default:
          throw new Error('Invalid action')
      }
    } catch (validationError) {
      console.error('Validation error:', validationError)
      throw new Error('Invalid input data')
    }

    const { action } = validatedData

    let result

    switch (action) {
      case 'listUsers':
        // List all users for admin
        const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
        if (usersError) throw usersError
        result = { data: usersData }
        break

      case 'createUser':
        result = await supabaseAdmin.auth.admin.createUser({
          email: validatedData.email,
          password: validatedData.password,
          email_confirm: true,
          user_metadata: {
            full_name: validatedData.fullName,
          },
        })
        break

      case 'updatePassword':
        result = await supabaseAdmin.auth.admin.updateUserById(
          validatedData.userId,
          { password: validatedData.password }
        )
        break

      case 'updateUser':
        // Update auth.users
        result = await supabaseAdmin.auth.admin.updateUserById(
          validatedData.userId,
          {
            email: validatedData.email,
            user_metadata: { full_name: validatedData.fullName },
          }
        )
        
        // Also update the profiles table
        if (!result.error) {
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ full_name: validatedData.fullName })
            .eq('id', validatedData.userId)
          
          if (profileError) {
            console.error('Error updating profile:', profileError)
          }
        }
        break

      case 'deleteUser':
        // Get user email to check if it's root@localhost
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(validatedData.userId)
        
        if (userData?.user?.email === 'root@localhost') {
          throw new Error('Cannot delete root@localhost user')
        }

        result = await supabaseAdmin.auth.admin.deleteUser(validatedData.userId)
        break

      default:
        throw new Error('Invalid action')
    }

    if (result.error) {
      throw result.error
    }

    return new Response(
      JSON.stringify({ success: true, data: result.data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Admin manage users error:', error)
    
    // Return generic error message to prevent information leakage
    const safeErrorMessage = error.message === 'User is not an admin' 
      ? 'Unauthorized access' 
      : error.message === 'Invalid input data'
      ? 'Invalid request data'
      : 'An error occurred while processing your request'
    
    return new Response(
      JSON.stringify({ error: safeErrorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'User is not an admin' ? 403 : 400,
      }
    )
  }
})

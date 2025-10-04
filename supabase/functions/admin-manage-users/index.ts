import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    const { action, userId, email, password, fullName } = await req.json()

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
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
          },
        })
        break

      case 'updatePassword':
        result = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { password }
        )
        break

      case 'updateUser':
        // Update auth.users
        result = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          {
            email,
            user_metadata: { full_name: fullName },
          }
        )
        
        // Also update the profiles table
        if (!result.error) {
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ full_name: fullName })
            .eq('id', userId)
          
          if (profileError) {
            console.error('Error updating profile:', profileError)
          }
        }
        break

      case 'deleteUser':
        result = await supabaseAdmin.auth.admin.deleteUser(userId)
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
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

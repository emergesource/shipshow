import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// CORS Headers
// ============================================================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// Main Handler
// ============================================================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get OAuth code from request
    const { code } = await req.json();
    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Missing OAuth code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Exchange code for access token
    const clientId = Deno.env.get('NEXT_PUBLIC_TODOIST_CLIENT_ID');
    const clientSecret = Deno.env.get('TODOIST_CLIENT_SECRET');
    const appUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000';
    const redirectUri = `${appUrl}/protected/integrations/todoist/callback`;

    const tokenResponse = await fetch('https://todoist.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Todoist token exchange failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to exchange OAuth code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'No access token received' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store the connection in oauth_connections table
    const { error: insertError } = await supabase
      .from('oauth_connections')
      .upsert({
        user_id: user.id,
        provider: 'todoist',
        access_token: accessToken,
        // Todoist tokens don't expire, but we'll set a far future date
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      }, {
        onConflict: 'user_id,provider'
      });

    if (insertError) {
      console.error('Error storing Todoist connection:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store connection' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in todoist-oauth-callback:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

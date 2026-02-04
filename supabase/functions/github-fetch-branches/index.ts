import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getGitHubToken, fetchFromGitHub } from '../_shared/github.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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

    // Get repository_id from request
    const { repository_id } = await req.json();
    if (!repository_id) {
      return new Response(
        JSON.stringify({ error: 'repository_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get repository details
    const { data: repo, error: repoError } = await supabase
      .from('repositories')
      .select('owner, name, user_id')
      .eq('id', repository_id)
      .eq('user_id', user.id)
      .single();

    if (repoError || !repo) {
      return new Response(
        JSON.stringify({ error: 'Repository not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get GitHub token
    const githubToken = await getGitHubToken(supabase, user.id);

    // Fetch branches from GitHub
    const branches = await fetchFromGitHub(
      `/repos/${repo.owner}/${repo.name}/branches`,
      githubToken
    );

    return new Response(
      JSON.stringify({ branches: branches.map((b: any) => b.name) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in github-fetch-branches:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

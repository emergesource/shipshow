import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getGitHubToken, fetchFromGitHub } from '../_shared/github.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { repository_id, since, until } = await req.json();

    if (!repository_id) {
      return new Response(
        JSON.stringify({ error: 'repository_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authenticated user
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
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns this repository
    const { data: repo, error: repoError } = await supabase
      .from('repositories')
      .select('full_name, github_repo_id, user_id, default_branch')
      .eq('id', repository_id)
      .eq('user_id', user.id)
      .single();

    if (repoError || !repo) {
      return new Response(
        JSON.stringify({ error: 'Repository not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!repo.full_name) {
      return new Response(
        JSON.stringify({ error: 'Repository full_name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get GitHub access token
    const githubToken = await getGitHubToken(supabase, user.id);

    // Build GitHub API endpoint
    let endpoint = `/repos/${repo.full_name}/commits?per_page=100`;
    if (repo.default_branch) {
      endpoint += `&sha=${repo.default_branch}`;
    }
    if (since) {
      endpoint += `&since=${since}`;
    }
    if (until) {
      endpoint += `&until=${until}`;
    }

    // Fetch commits from GitHub
    const commits = await fetchFromGitHub(endpoint, githubToken);

    // Transform and insert commits
    const commitData = commits.map((c: any) => ({
      repository_id,
      sha: c.sha,
      author: c.commit.author.name || c.commit.author.email || 'Unknown',
      message: c.commit.message,
      committed_at: c.commit.author.date
    }));

    if (commitData.length === 0) {
      return new Response(
        JSON.stringify({ success: true, count: 0, message: 'No new commits found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert commits (ignore duplicates based on sha)
    const { error: insertError } = await supabase
      .from('commits')
      .upsert(commitData, {
        onConflict: 'sha',
        ignoreDuplicates: true
      });

    if (insertError) {
      console.error('Error inserting commits:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store commits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update repository updated_at timestamp
    await supabase
      .from('repositories')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', repository_id);

    return new Response(
      JSON.stringify({
        success: true,
        count: commitData.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in github-fetch-commits:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function getGitHubToken(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('oauth_connections')
    .select('access_token')
    .eq('user_id', userId)
    .eq('provider', 'github')
    .single();

  if (error || !data) {
    throw new Error('GitHub not connected');
  }

  return data.access_token;
}

export async function fetchFromGitHub(endpoint: string, token: string) {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Shipshow'
    }
  });

  if (!response.ok) {
    let errorMessage = 'GitHub API error';
    try {
      const error = await response.json();
      errorMessage = error.message || errorMessage;
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export function validateEnvironment() {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
  const missing = required.filter(key => !Deno.env.get(key));

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

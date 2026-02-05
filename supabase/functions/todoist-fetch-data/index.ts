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
// Helper: Get Todoist Access Token
// ============================================================================
async function getTodoistToken(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('oauth_connections')
    .select('access_token')
    .eq('user_id', userId)
    .eq('provider', 'todoist')
    .single();

  if (error || !data) {
    console.error('Failed to get Todoist token:', error);
    throw new Error('Todoist not connected');
  }

  console.log('Retrieved Todoist token:', {
    hasToken: !!data.access_token,
    tokenLength: data.access_token?.length,
    tokenPrefix: data.access_token?.substring(0, 10)
  });

  return data.access_token;
}

// ============================================================================
// Helper: Fetch from Todoist API
// ============================================================================
async function fetchFromTodoist(endpoint: string, token: string): Promise<any> {
  // Current unified Todoist API v1 (not /rest/v1 or /rest/v2 which are deprecated)
  const url = `https://api.todoist.com/api/v1${endpoint}`;
  console.log('Fetching from Todoist:', url);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Todoist API error:', {
      url,
      status: response.status,
      statusText: response.statusText,
      errorText,
      hasToken: !!token,
      tokenPrefix: token?.substring(0, 10)
    });
    throw new Error(`Todoist API error: ${response.status}`);
  }

  return await response.json();
}

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

    // Get request type and params
    const { type, project_id, since, until } = await req.json();

    // Get Todoist token
    const todoistToken = await getTodoistToken(supabase, user.id);

    // Handle different request types
    if (type === 'projects') {
      // Fetch all user projects
      console.log('Fetching Todoist projects for user:', user.id);

      const projectsResponse = await fetchFromTodoist('/projects', todoistToken);
      console.log('Retrieved projects response:', {
        type: typeof projectsResponse,
        isArray: Array.isArray(projectsResponse),
        sample: projectsResponse?.[0] || projectsResponse
      });

      // Extract array from response (same logic as tasks)
      let projects: any[] = [];
      if (Array.isArray(projectsResponse)) {
        projects = projectsResponse;
      } else if (typeof projectsResponse === 'object' && projectsResponse !== null) {
        const values = Object.values(projectsResponse);
        for (const value of values) {
          if (Array.isArray(value)) {
            projects = value;
            break;
          }
        }
      }

      // The unified API v1 returns projects with numeric IDs
      // We need to use the numeric 'id' field, not 'v2_id' or other fields
      console.log('Sample project structure:', projects[0]);

      return new Response(
        JSON.stringify({ projects }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (type === 'tasks') {
      // Fetch tasks for specific project within time period
      if (!project_id) {
        return new Response(
          JSON.stringify({ error: 'project_id required for tasks' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Fetching tasks for project_id:', project_id);

      // Fetch tasks filtered by project
      const tasksResponse = await fetchFromTodoist(
        `/tasks?project_id=${project_id}`,
        todoistToken
      );

      console.log('Tasks response structure:', {
        type: typeof tasksResponse,
        isArray: Array.isArray(tasksResponse),
        keys: tasksResponse ? Object.keys(tasksResponse) : null,
        sample: tasksResponse
      });

      // Ensure allTasks is an array - default to empty array
      let allTasks: any[] = [];

      if (Array.isArray(tasksResponse)) {
        console.log('Response is already an array');
        allTasks = tasksResponse;
      } else if (typeof tasksResponse === 'object' && tasksResponse !== null) {
        console.log('Response is an object, trying to extract array');

        // Check if response has a 'results' property (unified API v1 format)
        if (tasksResponse.results && Array.isArray(tasksResponse.results)) {
          console.log('Found results array:', tasksResponse.results.length, 'items');
          allTasks = tasksResponse.results;
        } else {
          // Try to extract array from object structure (fallback)
          const values = Object.values(tasksResponse);
          console.log('Object values:', values);

          for (const value of values) {
            if (Array.isArray(value)) {
              console.log('Found array value:', value.length, 'items');
              allTasks = value;
              break;
            }
          }
        }
      }

      console.log('Final allTasks array:', {
        isArray: Array.isArray(allTasks),
        length: allTasks.length,
        type: typeof allTasks,
        sample: allTasks[0]
      });

      // Fetch completed tasks using Sync API
      let completedTasks = [];
      if (since && until) {
        try {
          // Use Sync API to get completed items
          // The Sync API uses the same token but different base URL
          const syncResponse = await fetch(
            'https://api.todoist.com/sync/v9/completed/get_all',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${todoistToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                project_id: project_id,
                limit: 200  // Max allowed by API
              })
            }
          );

          if (syncResponse.ok) {
            const completedData = await syncResponse.json();
            completedTasks = completedData.items || [];
            console.log('Completed tasks from Sync API:', completedTasks.length, 'tasks');
            if (completedTasks.length > 0) {
              console.log('Sample completed task structure:', JSON.stringify(completedTasks[0]));
            }
          } else {
            const errorText = await syncResponse.text();
            console.error('Sync API error:', syncResponse.status, errorText);
          }
        } catch (error) {
          console.error('Error fetching completed tasks:', error);
        }
      }

      // Filter by date range if provided
      let tasksAddedOrUpdated = allTasks;
      let tasksCompleted = completedTasks;

      // Ensure allTasks and completedTasks are arrays before filtering
      if (!Array.isArray(allTasks)) {
        console.error('allTasks is not an array:', typeof allTasks, allTasks);
        allTasks = [];
      }
      if (!Array.isArray(completedTasks)) {
        console.error('completedTasks is not an array:', typeof completedTasks, completedTasks);
        completedTasks = [];
      }

      if (since && until) {
        const sinceDate = new Date(since);
        const untilDate = new Date(until);

        // Filter tasks that were created OR updated within range
        // Note: unified API v1 uses 'added_at' not 'created_at'
        tasksAddedOrUpdated = allTasks.filter((task: any) => {
          const addedAt = new Date(task.added_at);
          // Check if task was created in range
          if (addedAt >= sinceDate && addedAt <= untilDate) {
            return true;
          }
          // Check if task was updated in range (if it has updated_at)
          if (task.updated_at) {
            const updatedAt = new Date(task.updated_at);
            if (updatedAt >= sinceDate && updatedAt <= untilDate && updatedAt > addedAt) {
              return true;
            }
          }
          return false;
        });

        // Filter completed tasks by completion date
        tasksCompleted = completedTasks.filter((item: any) => {
          if (!item.completed_at) return false;
          const completedAt = new Date(item.completed_at);
          return completedAt >= sinceDate && completedAt <= untilDate;
        });
      }

      console.log('Returning task counts:', {
        addedOrUpdated: tasksAddedOrUpdated.length,
        completed: tasksCompleted.length
      });

      return new Response(
        JSON.stringify({
          tasks_added_or_updated: tasksAddedOrUpdated,
          tasks_completed: tasksCompleted
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request type' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in todoist-fetch-data:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

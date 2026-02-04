import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// CONFIGURATION - Change model here
// ============================================================================
const OPENAI_MODEL = 'gpt-4o';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// ============================================================================
// CORS Headers
// ============================================================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// Helper: Build user prompt from context
// ============================================================================
function buildUserPrompt(data: {
  projectName: string;
  audienceName: string;
  audienceDescription: string | null;
  periodStart: string;
  periodEnd: string;
  notes: Array<{ content: string; created_at: string }>;
  commits: Array<{ message: string; author: string; committed_at: string }>;
  todoistTasks?: { addedOrUpdated: Array<{ content: string; created_at: string; due?: any }>; completed: Array<{ content: string; completed_at: string }> };
}): string {
  const { projectName, audienceName, audienceDescription, periodStart, periodEnd, notes, commits, todoistTasks } = data;

  let prompt = `# Summary Request

**Project**: ${projectName}
**Audience**: ${audienceName}`;

  if (audienceDescription) {
    prompt += `\n**Audience Context**: ${audienceDescription}`;
  }

  prompt += `\n**Time Period**: ${new Date(periodStart).toLocaleDateString()} to ${new Date(periodEnd).toLocaleDateString()}

## Work Evidence

### Notes (${notes.length})
`;

  if (notes.length > 0) {
    notes.forEach((note, i) => {
      prompt += `\n**Note ${i + 1}** (${new Date(note.created_at).toLocaleDateString()}):\n${note.content}\n`;
    });
  } else {
    prompt += '\nNo notes in this period.\n';
  }

  prompt += `\n### Commits (${commits.length})
`;

  if (commits.length > 0) {
    commits.forEach((commit, i) => {
      prompt += `\n**Commit ${i + 1}** (${commit.author}, ${new Date(commit.committed_at).toLocaleDateString()}):\n${commit.message}\n`;
    });
  } else {
    prompt += '\nNo commits in this period.\n';
  }

  // Add Todoist tasks if available
  if (todoistTasks) {
    const addedOrUpdatedTasks = todoistTasks.addedOrUpdated || [];
    const completedTasks = todoistTasks.completed || [];

    if (addedOrUpdatedTasks.length > 0 || completedTasks.length > 0) {
      prompt += `\n### Todoist Tasks
`;

      if (addedOrUpdatedTasks.length > 0) {
        prompt += `\n**Tasks Added or Updated (${addedOrUpdatedTasks.length})**:`;
        prompt += `\nThese tasks were created or modified during the period:`;
        addedOrUpdatedTasks.forEach((task, i) => {
          const dueInfo = task.due ? ` (due: ${task.due.date})` : '';
          prompt += `\n${i + 1}. ${task.content}${dueInfo}`;
        });
        prompt += '\n';
      }

      if (completedTasks.length > 0) {
        prompt += `\n**Tasks Completed (${completedTasks.length})**:`;
        prompt += `\nThese tasks were completed during the period:`;
        completedTasks.forEach((task, i) => {
          prompt += `\n${i + 1}. ${task.content} (completed: ${new Date(task.completed_at).toLocaleDateString()})`;
        });
        prompt += '\n';
      }
    }
  }

  prompt += `\n---

Based on the notes, commits, and tasks above, generate a summary appropriate for the "${audienceName}" audience.`;

  return prompt;
}

// ============================================================================
// Main Handler
// ============================================================================
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Parse request body
    const body = await req.json();
    const {
      project_id,
      project_name,
      audience_id,
      audience_name,
      audience_description,
      period_start,
      period_end,
      notes,
      commits,
      todoist_tasks
    } = body;

    // Validate required fields
    if (!project_id || !audience_id || !period_start || !period_end) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch default prompt template
    const { data: promptTemplate, error: promptError } = await supabase
      .from('prompt_templates')
      .select('system_prompt')
      .eq('is_default', true)
      .single();

    if (promptError || !promptTemplate) {
      return new Response(
        JSON.stringify({ error: 'No default prompt template found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the user prompt with context
    const userPrompt = buildUserPrompt({
      projectName: project_name,
      audienceName: audience_name,
      audienceDescription: audience_description,
      periodStart: period_start,
      periodEnd: period_end,
      notes: notes || [],
      commits: commits || [],
      todoistTasks: todoist_tasks
    });

    // Call OpenAI API
    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: promptTemplate.system_prompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI API error:', errorData);
      return new Response(
        JSON.stringify({
          error: 'Failed to generate summary',
          details: errorData.error?.message || 'Unknown error'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    const generatedText = openaiData.choices[0]?.message?.content;

    if (!generatedText) {
      return new Response(
        JSON.stringify({ error: 'No summary generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        summary: generatedText,
        model: OPENAI_MODEL,
        usage: openaiData.usage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-summary:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

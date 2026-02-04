-- ============================================================================
-- PROFILES
-- User profile information
-- ============================================================================
create table profiles (
  id uuid primary key references auth.users(id),
  name text,
  created_at timestamptz default now()
);


alter table profiles enable row level security;
grant select, insert, update on table profiles to authenticated;
create policy "Users can manage their own profile" on profiles
  for all
  using ( auth.uid() = id )
  with check ( auth.uid() = id );

-- ============================================================================
-- PROJECTS
-- Main container for work
-- ============================================================================
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


alter table projects enable row level security;
grant select, insert, update, delete on table projects to authenticated;
create policy "Users can manage their own projects" on projects
  for all
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );  

-- ============================================================================
-- NOTES
-- Raw written input from users
-- ============================================================================
create table notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id),
  title text,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


alter table notes enable row level security;
grant select, insert, update, delete on table notes to authenticated;
create policy "Users can manage notes in their own projects" on notes
    for all
    using ( project_id in (select id from projects where user_id = auth.uid()) )
    with check ( project_id in (select id from projects where user_id = auth.uid()) );
    

-- ============================================================================
-- REPOSITORIES
-- Linked git repositories
-- ============================================================================
create table repositories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  provider text not null,
  repo_url text,
  default_branch text,
  github_repo_id bigint unique,
  owner text,
  name text,
  full_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


alter table repositories enable row level security;
grant select, insert, update, delete on table repositories to authenticated;
create policy "Users can manage their own repositories" on repositories
    for all
    using ( auth.uid() = user_id )
    with check ( auth.uid() = user_id );


-- ============================================================================
-- PROJECT_REPOSITORIES
-- Join table for many-to-many relationship between projects and repositories
-- ============================================================================
create table project_repositories (
  project_id uuid not null references projects(id) on delete cascade,
  repository_id uuid not null references repositories(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (project_id, repository_id)
);


alter table project_repositories enable row level security;
grant select, insert, delete on table project_repositories to authenticated;
create policy "Users can manage project repositories in their own projects" on project_repositories
    for all
    using ( project_id in (select id from projects where user_id = auth.uid()) )
    with check ( project_id in (select id from projects where user_id = auth.uid()) );


-- ============================================================================
-- OAUTH_CONNECTIONS
-- Secure storage for OAuth tokens
-- ============================================================================
create table oauth_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_user_id text,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, provider)
);


alter table oauth_connections enable row level security;
grant select, insert, update, delete on table oauth_connections to authenticated;
create policy "Users can manage their own OAuth connections" on oauth_connections
    for all
    using ( auth.uid() = user_id )
    with check ( auth.uid() = user_id );


-- ============================================================================
-- COMMITS
-- Units of work that happened
-- ============================================================================
create table commits (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references repositories(id),
  sha text not null unique,
  author text,
  message text,
  committed_at timestamptz not null,
  created_at timestamptz default now()
);


alter table commits enable row level security;
grant select, insert, update, delete on table commits to authenticated;
create policy "Users can manage commits in their repositories" on commits
    for all
    using ( repository_id in (select id from repositories where user_id = auth.uid()) )
    with check ( repository_id in (select id from repositories where user_id = auth.uid()) );


-- ============================================================================
-- AUDIENCES
-- Target audiences for updates (global to user, reusable across projects)
-- ============================================================================
create table audiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  is_system_template boolean default false,
  system_template_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


alter table audiences enable row level security;
grant select, insert, update, delete on table audiences to authenticated;
create policy "Users can manage their own audiences" on audiences
    for all
    using ( auth.uid() = user_id )
    with check ( auth.uid() = user_id );


-- ============================================================================
-- PROMPT_TEMPLATES
-- System-wide base prompts for AI summary generation
-- ============================================================================
create table prompt_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  system_prompt text not null,
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table prompt_templates enable row level security;
grant select on table prompt_templates to authenticated;

-- ============================================================================
-- SUMMARIES
-- What the work means for a specific audience
-- ============================================================================
create table summaries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  audience_id uuid not null references audiences(id) on delete cascade,
  text text not null,
  period_start timestamptz,
  period_end timestamptz,
  repository_branches jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


alter table summaries enable row level security;
grant select, insert, update, delete on table summaries to authenticated;
create policy "Users can manage summaries in their own projects" on summaries
    for all
    using ( project_id in (select id from projects where user_id = auth.uid()) )
    with check ( project_id in (select id from projects where user_id = auth.uid()) );

-- ============================================================================
-- SUMMARY_NOTES
-- Join table linking summaries to notes
-- ============================================================================
create table summary_notes (
  summary_id uuid references summaries(id) on delete cascade,
  note_id uuid references notes(id) on delete cascade,
  primary key (summary_id, note_id)
);


alter table summary_notes enable row level security;
grant select, insert, delete on table summary_notes to authenticated;
create policy "Users can manage summary_notes in their own projects" on summary_notes
    for all
    using ( summary_id in (select s.id from summaries s join projects p on s.project_id = p.id where p.user_id = auth.uid()) )
    with check ( summary_id in  (select s.id from summaries s join projects p on s.project_id = p.id where p.user_id = auth.uid()) );

-- ============================================================================
-- SUMMARY_COMMITS
-- Join table linking summaries to commits
-- ============================================================================
create table summary_commits (
  summary_id uuid references summaries(id) on delete cascade,
  commit_id uuid references commits(id) on delete cascade,
  primary key (summary_id, commit_id)
);


alter table summary_commits enable row level security;
grant select, insert, delete on table summary_commits to authenticated;
create policy "Users can manage summary_commits in their own projects" on summary_commits
    for all
    using ( summary_id in (select s.id from summaries s join projects p on s.project_id = p.id where p.user_id = auth.uid()) )
    with check ( summary_id in  (select s.id from summaries s join projects p on s.project_id = p.id where p.user_id = auth.uid()) );

-- ============================================================================
-- CHANNELS
-- Where updates will be shared (Email, Twitter, LinkedIn, etc.)
-- ============================================================================
create table channels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  prompt_template text not null,
  character_limit int,
  created_at timestamptz default now()
);


alter table channels enable row level security;
grant select on table channels to authenticated;
create policy "All users can read channels" on channels
  for select
  to authenticated
  using (true);

-- ============================================================================
-- MESSAGES
-- Channel-formatted versions of summaries
-- ============================================================================
create table messages (
  id uuid primary key default gen_random_uuid(),
  summary_id uuid not null references summaries(id) on delete cascade,
  channel_id uuid not null references channels(id) on delete cascade,
  text text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(summary_id, channel_id)
);


alter table messages enable row level security;
grant select, insert, update, delete on table messages to authenticated;
create policy "Users can manage messages in their own projects" on messages
    for all
    using ( summary_id in (select s.id from summaries s join projects p on s.project_id = p.id where p.user_id = auth.uid()) )
    with check ( summary_id in  (select s.id from summaries s join projects p on s.project_id = p.id where p.user_id = auth.uid()) );       
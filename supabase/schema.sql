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
  project_id uuid not null references projects(id),
  provider text not null,
  repo_url text not null,
  default_branch text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


alter table repositories enable row level security;
grant select, insert, update, delete on table repositories to authenticated;
create policy "Users can manage repositories in their own projects" on repositories 
    for all
    using ( project_id in (select id from projects where user_id = auth.uid()) )
    with check ( project_id in (select id from projects where user_id = auth.uid()) );


-- ============================================================================
-- COMMITS
-- Units of work that happened
-- ============================================================================
create table commits (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references repositories(id),
  sha text not null,
  author text,
  message text,
  committed_at timestamptz not null,
  created_at timestamptz default now()
);


alter table commits enable row level security;
grant select, insert, update, delete on table commits to authenticated;
create policy "Users can manage commits in their own projects" on commits
    for all
    using ( repository_id in (select r.id from repositories r join projects p on r.project_id = p.id where p.user_id = auth.uid()) )
    with check ( repository_id in (select r.id from repositories r join projects p on r.project_id = p.id where p.user_id = auth.uid()) );


-- ============================================================================
-- AUDIENCES
-- Target audiences for updates
-- ============================================================================
create table audiences (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id),
  name text not null,
  tone text not null,
  length text not null,
  created_at timestamptz default now()
);


alter table audiences enable row level security;
grant select, insert, update, delete on table audiences to authenticated;
create policy "Users can manage audiences in their own projects" on audiences
    for all
    using ( project_id in (select id from projects where user_id = auth.uid()) )
    with check ( project_id in (select id from projects where user_id = auth.uid())
    );


-- ============================================================================
-- SUMMARIES
-- What the work means for a specific audience
-- ============================================================================
create table summaries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id),
  audience_id uuid not null references audiences(id),
  text text not null,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz default now()
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
  summary_id uuid references summaries(id),
  note_id uuid references notes(id),
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
  summary_id uuid references summaries(id),
  commit_id uuid references commits(id),
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
-- Where updates will be shared (Slack, LinkedIn, etc.)
-- ============================================================================
create table channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  max_length int,
  format text not null,
  rules jsonb,
  created_at timestamptz default now()
);


alter table channels enable row level security;
grant select on table channels to authenticated;

-- ============================================================================
-- MESSAGES
-- Channel-formatted versions of summaries
-- ============================================================================
create table messages (
  id uuid primary key default gen_random_uuid(),
  summary_id uuid not null references summaries(id),
  channel_id uuid not null references channels(id),
  content text not null,
  created_at timestamptz default now()
);


alter table messages enable row level security;
grant select, insert, update, delete on table messages to authenticated;
create policy "Users can manage messages in their own projects" on messages
    for all
    using ( summary_id in (select s.id from summaries s join projects p on s.project_id = p.id where p.user_id = auth.uid()) )
    with check ( summary_id in  (select s.id from summaries s join projects p on s.project_id = p.id where p.user_id = auth.uid()) );       
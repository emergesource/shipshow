# Shipshow

Turn messy, real work (notes + git activity) into clear, audience-appropriate updates that people can confidently share.

## Overview

Shipshow helps software engineers, managers, and freelancers showcase their work by combining:
- **Notes**: Raw written input about what you worked on
- **Git Commits**: Actual proof of work from connected repositories
- **AI Summaries**: Generated summaries tailored for specific audiences

The result: Clear, honest updates that show your progress without the manual effort of writing status reports.

## Tech Stack

- **Frontend**: Next.js (App Router), React 19, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Styling**: Tailwind CSS, shadcn/ui components
- **APIs**: OpenAI, GitHub OAuth, Stripe, Resend

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase CLI ([installation guide](https://supabase.com/docs/guides/cli))
- GitHub account (for repository integration)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/shipshow.git
   cd shipshow
   ```

2. **Install dependencies**
   ```bash
   cd apps/web
   npm install
   ```

3. **Set up Supabase locally**
   ```bash
   supabase start
   ```

   Note the output - you'll need the API URL and anon key.

4. **Configure environment variables**

   Create `apps/web/.env.local`:
   ```bash
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key

   # GitHub OAuth (see GitHub Integration section below)
   NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

5. **Run the database migrations**
   ```bash
   supabase db reset
   ```

6. **Start the development server**
   ```bash
   cd apps/web
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## GitHub Integration

Shipshow connects to your GitHub repositories to automatically fetch commits as evidence of work.

### Setup GitHub OAuth App

1. **Create GitHub OAuth App**
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Click **"New OAuth App"**
   - Fill in the application details:
     - **Application name**: `Shipshow` (or your preferred name)
     - **Homepage URL**: `http://localhost:3000` (for local development)
     - **Authorization callback URL**: `http://localhost:3000/protected/repositories/callback`
   - Click **"Register application"**
   - Copy the **Client ID** and generate a new **Client Secret**

2. **Add credentials to local environment**

   Update `apps/web/.env.local`:
   ```bash
   NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id_here
   GITHUB_CLIENT_SECRET=your_github_client_secret_here
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **Configure Supabase Edge Functions**

   In your Supabase Dashboard:
   - Navigate to **Edge Functions** > **Settings**
   - Add the following secrets:
     - `GITHUB_CLIENT_ID`: Your GitHub OAuth app client ID
     - `GITHUB_CLIENT_SECRET`: Your GitHub OAuth app client secret
     - `NEXT_PUBLIC_APP_URL`: Your app URL (production URL for deployment)

4. **Deploy Edge Functions**
   ```bash
   # Deploy all edge functions
   supabase functions deploy

   # Or deploy individually
   supabase functions deploy github-oauth-callback
   supabase functions deploy github-fetch-repos
   supabase functions deploy github-fetch-commits
   ```

### Testing GitHub Integration Locally

For local development, you can use the Supabase CLI to serve edge functions locally:

```bash
# In a separate terminal
supabase functions serve --env-file apps/web/.env.local
```

However, for GitHub OAuth callback to work locally, you need to:
1. Use the production edge functions (recommended), OR
2. Set up a tunnel service like ngrok to expose your local server

### Connecting Repositories

1. Navigate to **Repositories** in the app
2. Click **"Connect Repository"**
3. Choose **"Connect with GitHub"**
4. Authorize Shipshow to access your repositories
5. Select which repositories to import and assign them to projects
6. Click **"Fetch Commits"** on any repository to import commit history

### GitHub OAuth Scopes

Shipshow requests the `repo` scope, which provides:
- Read access to code
- Read access to commit statuses
- Read access to repository metadata

Your credentials and OAuth tokens are:
- Never stored in plain text
- Encrypted at rest in Supabase
- Only accessible through secure server-side edge functions
- Never exposed to the client

## Development Commands

### Web Application (apps/web)

```bash
# Start development server (runs on http://localhost:3000)
cd apps/web && npm run dev

# Build for production
cd apps/web && npm run build

# Start production server
cd apps/web && npm start

# Run linting
cd apps/web && npm run lint
```

### Supabase Local Development

```bash
# Start local Supabase instance
supabase start

# Stop local Supabase
supabase stop

# Reset database (WARNING: deletes all data)
supabase db reset

# View database in Supabase Studio
# Open http://127.0.0.1:54323 in your browser

# Create a new migration
supabase migration new migration_name

# Deploy edge functions
supabase functions deploy

# View edge function logs
supabase functions logs function_name
```

**Supabase Ports:**
- Studio: `54323`
- API: `54321`
- Database: `54322`

## Database Schema

### Core Tables

- **profiles**: User profile information
- **projects**: Main container for organizing work
- **notes**: Raw written input from users
- **repositories**: Linked git repositories (many-to-many with projects)
- **project_repositories**: Junction table for projects ↔ repositories
- **commits**: Git commits fetched from repositories
- **oauth_connections**: Secure storage for OAuth tokens (GitHub, etc.)

### Summary & Output Tables

- **audiences**: Target audiences for updates (manager, client, public)
- **summaries**: AI-generated summaries of work for specific audiences
- **summary_notes**: Links summaries to notes
- **summary_commits**: Links summaries to commits
- **channels**: Output channels (Slack, LinkedIn, email)
- **messages**: Channel-formatted versions of summaries

All tables use Row Level Security (RLS) to ensure users can only access their own data.

## Project Structure

```
shipshow/
├── apps/
│   └── web/                       # Next.js application
│       ├── app/
│       │   ├── auth/             # Authentication pages
│       │   └── protected/        # Protected routes
│       │       ├── projects/     # Project CRUD
│       │       ├── notes/        # Notes CRUD
│       │       └── repositories/ # Repository CRUD & GitHub integration
│       ├── components/           # React components
│       │   └── ui/              # shadcn/ui components
│       └── lib/
│           └── supabase/        # Supabase client configuration
├── supabase/
│   ├── functions/               # Edge functions
│   │   ├── _shared/            # Shared utilities
│   │   ├── github-oauth-callback/
│   │   ├── github-fetch-repos/
│   │   └── github-fetch-commits/
│   ├── migrations/             # Database migrations
│   └── schema.sql              # Complete database schema
└── README.md                   # This file
```

## Environment Variables

### Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=          # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=  # Your Supabase anon key

# GitHub OAuth
NEXT_PUBLIC_GITHUB_CLIENT_ID=      # GitHub OAuth app client ID
GITHUB_CLIENT_SECRET=              # GitHub OAuth app client secret (server-side only)
NEXT_PUBLIC_APP_URL=               # Your application URL
```

### Optional (for future features)

```bash
# OpenAI (for AI summaries - coming soon)
OPENAI_API_KEY=                    # OpenAI API key

# Stripe (for subscriptions - coming soon)
STRIPE_SECRET_KEY=                 # Stripe secret key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=  # Stripe publishable key

# Resend (for email - coming soon)
RESEND_API_KEY=                    # Resend API key
```

## Deployment

### Production Setup

1. **Deploy to Vercel/Netlify/Your hosting provider**
   - Connect your repository
   - Configure environment variables (see above)

2. **Set up production Supabase project**
   - Create project at [supabase.com](https://supabase.com)
   - Run migrations: `supabase db push`
   - Deploy edge functions: `supabase functions deploy`
   - Configure secrets in Supabase Dashboard

3. **Update GitHub OAuth App**
   - Add production callback URL: `https://yourdomain.com/protected/repositories/callback`
   - Update `NEXT_PUBLIC_APP_URL` environment variable

## Troubleshooting

### GitHub OAuth Issues

**"Invalid callback URL"**
- Verify the callback URL in your GitHub OAuth app matches: `http://localhost:3000/protected/repositories/callback` (local) or your production URL
- Check that `NEXT_PUBLIC_APP_URL` environment variable is set correctly

**"GitHub not connected" error**
- Ensure edge functions are deployed: `supabase functions deploy`
- Check that GitHub secrets are configured in Supabase Dashboard
- Verify OAuth flow completed successfully in browser network tab

### Database Issues

**RLS policy errors**
- Ensure you're authenticated (check `/auth/login`)
- Verify migrations are up to date: `supabase db reset` (local) or `supabase db push` (production)

**Missing tables**
- Run migrations: `supabase db reset` (local)
- Check `supabase/schema.sql` for the latest schema

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

[Your License Here]

## Support

For questions or issues:
- GitHub Issues: [Link to issues]
- Email: [Your email]
- Documentation: [Link to docs]

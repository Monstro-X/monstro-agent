# Open Agents


Open Agents is an open-source reference app for building and running background coding agents on Vercel. It includes the web UI, the agent runtime, sandbox orchestration, and the GitHub integration needed to go from prompt to code changes without keeping your laptop involved.

The repo is meant to be forked and adapted, not treated as a black box.

## What it is

Open Agents is a three-layer system:

```text
Web -> Agent workflow -> Sandbox VM
```

- The web app handles auth, sessions, chat, and streaming UI.
- The agent runs as a durable workflow on Vercel.
- The sandbox is the execution environment: filesystem, shell, git, dev servers, and preview ports.

### The key architectural decision: the agent is not the sandbox

The agent does not run inside the VM. It runs outside the sandbox and interacts with it through tools like file reads, edits, search, and shell commands.

That separation is the main point of the project:

- agent execution is not tied to a single request lifecycle
- sandbox lifecycle can hibernate and resume independently
- model/provider choices and sandbox implementation can evolve separately
- the VM stays a plain execution environment instead of becoming the control plane

## Current capabilities

- chat-driven coding agent with file, search, shell, task, skill, and web tools
- durable multi-step execution with Workflow SDK-backed runs, streaming, and cancellation
- isolated Vercel sandboxes with snapshot-based resume
- repo cloning and branch work inside the sandbox
- optional auto-commit, push, and PR creation after a successful run
- session sharing via read-only links
- optional voice input via ElevenLabs transcription

## Runtime notes

A few details that matter for understanding the current implementation:

- Chat requests start a workflow run instead of executing the agent inline.
- Each agent turn can continue across many persisted workflow steps.
- Active runs can be resumed by reconnecting to the stream for the existing workflow.
- Sandboxes expose ports `3000`, `5173`, `4321`, and `8000`, can optionally use a configured base snapshot, and hibernate after inactivity.
- Auto-commit and auto-PR are supported, but they are preference-driven features, not always-on behavior.

## Environment variables

See `apps/web/.env.example` for the full list. Summary:

### Minimum runtime

```env
POSTGRES_URL=
BETTER_AUTH_SECRET=
```

### Required for Monstro Admin sign-in and Vercel access

```env
BETTER_AUTH_URL=https://agent.example.com
MONSTRO_AUTH_URL=https://admin.example.com
MONSTRO_AGENT_SSO_SECRET=
VERCEL_ACCESS_TOKEN=
```

### Required for GitHub repo access, pushes, and PRs

```env
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_INSTALLATION_ID=
GITHUB_APP_ACCOUNT_LOGIN=
```

### Optional

```env
REDIS_URL=
KV_URL=
OPEN_AGENTS_RESOURCE_PROFILE=
VERCEL_PROJECT_PRODUCTION_URL=
NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL=
VERCEL_SANDBOX_BASE_SNAPSHOT_ID=
ELEVENLABS_API_KEY=
NEXT_PUBLIC_GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
NEXT_PUBLIC_GITHUB_APP_SLUG=
GITHUB_WEBHOOK_SECRET=
```

- `REDIS_URL` / `KV_URL`: optional skills metadata cache (falls back to in-memory when not configured).
- `OPEN_AGENTS_RESOURCE_PROFILE`: optional deployment resource profile. Set to `hobby` to use Hobby-compatible defaults for chat and sandbox resources; leave unset for standard behavior.
- `VERCEL_PROJECT_PRODUCTION_URL` / `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL`: canonical production URL for metadata and some callback behavior.
- `VERCEL_SANDBOX_BASE_SNAPSHOT_ID`: optional base snapshot for fresh sandboxes. If unset, sandboxes start from Vercel's standard Sandbox runtime. Use a snapshot created in/accessible to your own Vercel scope.
- `ELEVENLABS_API_KEY`: voice transcription.

## Deploy your own copy on Vercel

1. Fork this repo.
2. Import the repo into Vercel. Neon Postgres is auto-provisioned if you use the deploy button above.
3. Generate a secret for session signing:

   ```bash
   openssl rand -base64 32   # BETTER_AUTH_SECRET
   ```

4. Add env vars in Vercel project settings:

   ```env
   POSTGRES_URL=
   BETTER_AUTH_SECRET=
   ```

5. Deploy once to get a stable production URL.
6. Configure the Agent deployment:

   ```env
   BETTER_AUTH_URL=https://YOUR_AGENT_DOMAIN
   MONSTRO_AUTH_URL=https://YOUR_ADMIN_DOMAIN
   MONSTRO_AGENT_SSO_SECRET=              # same random value in both apps
   VERCEL_ACCESS_TOKEN=                   # billing owner's server-side token
   ```

7. Configure the Admin deployment:

   ```env
   MONSTRO_AGENT_URL=https://YOUR_AGENT_DOMAIN
   MONSTRO_AGENT_SSO_SECRET=              # same value as the Agent deployment
   ```

8. Create a GitHub App with repository permissions:
   - Contents: read and write
   - Pull requests: read and write
9. Install the app on the Monstro GitHub organization and select only the
   repositories editors may access.
10. Add `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`,
    `GITHUB_APP_INSTALLATION_ID` (the number in the installation settings
    URL), and `GITHUB_APP_ACCOUNT_LOGIN` (the organization login), then
    redeploy.
11. Optionally configure the GitHub App webhook and account-linking variables,
    Redis/KV, `OPEN_AGENTS_RESOURCE_PROFILE=hobby`, canonical production URL
    vars, and `VERCEL_SANDBOX_BASE_SNAPSHOT_ID`.

## Local setup

1. Install dependencies:

   ```bash
   corepack enable
   pnpm install
   ```

2. Create your local env file:

   ```bash
   cp apps/web/.env.example apps/web/.env
   ```

3. Fill in the required values in `apps/web/.env`.
4. Start the app:

   ```bash
   pnpm web
   ```

If you already have a linked Vercel project, you can pull env vars locally with `vc env pull`.

## Authentication and integration setup

### Monstro Admin session handoff

Editors sign in with their existing Monstro Admin account. Admin sends the
Agent a server-to-server, 60-second one-time code; the Agent consumes it and
creates its own Better Auth session. No editor Vercel or GitHub account is
required.

Agent deployment:

```env
MONSTRO_AUTH_URL=https://YOUR_ADMIN_DOMAIN
MONSTRO_AGENT_SSO_SECRET=...
VERCEL_ACCESS_TOKEN=... # billing owner's server-side token
```

Admin deployment:

```env
MONSTRO_AGENT_URL=https://YOUR_AGENT_DOMAIN
MONSTRO_AGENT_SSO_SECRET=... # exactly the same value
```

### GitHub App

Create one GitHub App owned by Monstro, grant it **Contents** and **Pull
requests** read/write permissions, and install it only on the repositories
editors may access. Copy the installation ID from its settings URL:

```text
https://github.com/settings/installations/INSTALLATION_ID
```

Then set:

```env
GITHUB_APP_ID=...
GITHUB_APP_PRIVATE_KEY=...
GITHUB_APP_INSTALLATION_ID=...
GITHUB_APP_ACCOUNT_LOGIN=Monstro-X
```

Every Monstro-authenticated editor receives access to that shared installation.
GitHub operations use short-lived installation tokens; commit and merge paths
further scope tokens to one repository.
`GITHUB_APP_PRIVATE_KEY` accepts PEM contents with escaped newlines or a
base64-encoded PEM.

GitHub OAuth is not required. Configure `NEXT_PUBLIC_GITHUB_CLIENT_ID`,
`GITHUB_CLIENT_SECRET`, and `NEXT_PUBLIC_GITHUB_APP_SLUG` only if editors should
also link personal GitHub accounts. Configure `GITHUB_WEBHOOK_SECRET` only when
using the optional installation webhook.

## Useful commands

```bash
pnpm web                    # run dev server
pnpm check                  # lint + format check
pnpm fix                    # lint + format fix
pnpm typecheck              # typecheck all packages
pnpm run ci                 # full CI: check, typecheck, tests, migration check
pnpm sandbox:snapshot-base  # refresh sandbox base snapshot
```

## Repo layout

```text
apps/web         Next.js app, workflows, auth, chat UI
packages/agent   agent implementation, tools, subagents, skills
packages/sandbox sandbox abstraction and Vercel sandbox integration
packages/shared  shared utilities
```

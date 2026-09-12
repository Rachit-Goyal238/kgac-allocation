# Architecture Overview

## System Architecture

The Team Allocation Calendar is a modern Single Page Application (SPA) built with a React frontend and a Supabase backend. It uses a serverless architecture where the frontend communicates directly with the database via PostgREST APIs provided by Supabase, protected by Row Level Security (RLS) policies.

## Tech Stack

- **Frontend**: React 19, Vite 6
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **Routing**: React Router
- **State Management**: React Query (Server state), Zustand/React Context (Local state)
- **Backend/Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Google OAuth)

## Database Schema

Key tables:
- `profiles`: Extends the Supabase `auth.users` table. Contains `role` (admin, manager, employee), `department_id`, and `status`.
- `allocations`: Records time logged by users. Contains `user_id`, `date`, `hours`, `project_id`, and `status` (billable, internal, bench, pto).
- `holidays`: Global company holidays. Contains `date`, `name`, `is_recurring`, and `year`.

## Authentication Flow

1. User clicks "Sign in with Google".
2. Supabase handles the OAuth flow.
3. Upon successful login, a PostgreSQL trigger (`on_auth_user_created`) automatically provisions a corresponding row in the `profiles` table with a `pending` status.
4. The frontend listens to Auth state changes and fetches the user's profile to enforce RBAC (Role-Based Access Control) on the UI.

## RBAC Implementation

- **Database Level**: RLS policies strictly control who can select, insert, update, or delete rows. For example, an employee can only update their own `allocations`, while an admin can update any `allocations`.
- **Frontend Level**: Route guards redirect users based on their role. UI components (like the Admin tab or edit buttons on other users' calendars) are conditionally rendered.

## Offline Support & Sync

- **Caching**: React Query is configured with long stale times and persists cache to localStorage.
- **Mutation Queue**: Offline mutations are intercepted and stored in a local queue.
- **Auto-replay**: When the browser fires a `online` event, the queue is processed sequentially to sync changes to Supabase.

## Performance Considerations

- **RLS Optimization**: Policies are written to avoid expensive joins where possible, utilizing JWT claims if applicable.
- **Data Fetching**: The calendar grid fetches allocations in bulk for a specified date range, minimizing the number of network requests.
- **Exporting**: Heavy CSV/Excel processing is handled on the client-side using `papaparse` and `exceljs` to offload work from the server.

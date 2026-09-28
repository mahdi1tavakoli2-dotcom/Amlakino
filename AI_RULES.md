# AI_RULES.md — Project Guidance

## Tech Stack

- **React 19** with **TypeScript** — UI and type safety
- **Vite** — build tool and dev server
- **Tailwind CSS v4** — styling (use Tailwind utility classes extensively)
- **shadcn/ui** — prebuilt components (Button, Card, Input, Modal, Badge, etc.)
- **Supabase** (`@supabase/supabase-js`) — auth, database, edge functions
- **Lucide React** — icons
- **Motion** — animations
- **React Router** — routing (routes defined in `src/App.tsx`)

## Library Usage Rules

- **Styling:** Always use Tailwind CSS utility classes. Do not write custom CSS unless absolutely necessary.
- **Components:** Use shadcn/ui components from `src/components/`. Do not edit shadcn/ui source files directly — create new wrapper components if customization is needed.
- **Pages:** Put pages in `src/pages/`. The default page is `src/pages/Index.tsx`.
- **Routing:** Keep all routes in `src/App.tsx`. Use React Router for navigation.
- **Supabase Client:** Import from `src/lib/supabase.ts`. Do not create additional Supabase client instances.
- **Auth:** Use `AuthProvider` from `src/context/AuthContext.tsx`. Monitor auth state with `supabase.auth.onAuthStateChange`.
- **Icons:** Use `lucide-react` for all icons.
- **Services:** Put business logic in `src/services/`. Keep components thin — delegate to services.
- **Types:** Define shared types in `src/types/index.ts`.
- **Utils:** Put helper functions in `src/utils/`.
- **Database:** Use `execute_sql` tool for all DB operations. Never write SQL migration files to `supabase/migrations/`.
- **Edge Functions:** Write in `supabase/functions/`. Always include CORS headers and verify JWTs for authenticated operations.

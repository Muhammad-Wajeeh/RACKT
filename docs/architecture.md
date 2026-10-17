# Architecture

## Layout

```
RACKT/
├── AGENTS.md / CLAUDE.md      pointers to these docs
├── docs/                      you are here
├── package.json               root: Supabase CLI + db:* scripts only
├── supabase/
│   ├── config.toml
│   └── migrations/            SQL migrations (see database.md)
└── Frontend/                  the whole app (Vite)
    ├── .env.local             SECRET-ish config, git-ignored, never read or print it
    ├── .env.example           names of required env vars
    └── src/
        ├── main.tsx           BrowserRouter + root render
        ├── App.tsx            route table
        ├── index.css          global reset, CSS variables, shared .btn classes
        ├── auth/              AuthContext (useAuth) and route guards
        ├── lib/supabase.ts    the single Supabase client
        ├── layouts/AppLayout  sidebar + <Outlet/> shell
        ├── components/        Sidebar, PageHeader
        └── pages/             one component (+ .css) per route
```

There is **no custom backend**. An earlier Express backend was deleted; the browser talks
to Supabase (Postgres, Auth, Storage) directly with the publishable key. Row Level Security
is what protects data, so every table must have RLS enabled.

## Stack

Vite 8, React 19, TypeScript, `react-router-dom` 7, `@supabase/supabase-js`. Styling is plain
CSS (one `.css` file next to each component). MUI/Emotion are not used in the app.

## Routes (`src/App.tsx`)

| Path | Page | Access |
|---|---|---|
| `/login`, `/signup` | `AuthPage` (`mode` prop) | guests only (`GuestOnly`; signed-in users go to `/closet`) |
| `/` | redirect to `/closet` | signed in |
| `/closet` | `ClosetPage` | signed in |
| `/outfits` | `OutfitsPage` | signed in |
| `/bins` | `BinsPage` | signed in |
| `/profile` | `ProfilePage` | signed in |
| anything else | redirect to `/closet` | signed in |

Signed-in routes sit inside `RequireAuth` (redirects to `/login`) and `AppLayout`.

## Auth flow

- `AuthProvider` loads the session with `supabase.auth.getSession()` and subscribes to
  `onAuthStateChange`. `useAuth()` returns `{ user, session, loading }`.
- Email/password: `signInWithPassword` / `signUp` (name stored in `user_metadata.display_name`).
- Google: `signInWithOAuth({ provider: 'google' })`. Requires the provider to be enabled in the
  Supabase dashboard, and as of writing it is not.
- Sign out: `supabase.auth.signOut()` on the Profile page.
- Supabase has email confirmation on (`mailer_autoconfirm: false`), so signup may show
  "Check your email" instead of signing the user in.

## Environment variables (Frontend/.env.local)

`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Only `VITE_`-prefixed vars reach the
browser. Never use or add the `service_role` / secret key in frontend code.

## Dev server

`.claude/launch.json` defines `frontend` (`npm run dev --prefix Frontend`, port 5173; Vite
picks another port if it's taken).

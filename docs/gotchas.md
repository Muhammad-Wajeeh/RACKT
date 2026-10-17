# Gotchas

- **Vite sometimes serves stale files.** The repo lives in OneDrive, which can make Vite's file
  watcher miss edits (symptom: a blank page or "X is not defined" for something that is clearly
  imported). `touch` the changed files, or restart the dev server.
- **Hot-reload errors can be transient.** Touching several files at once can log one-off errors
  (e.g. "useAuth must be used inside AuthProvider"). Reload the page and recheck before debugging.
- **Windows shell quoting.** Complex `sed` one-liners with backticks or nested quotes break in
  Git Bash. Prefer the Edit/Write tools or a small `node` script. Python is not installed.
- **Secrets.** `Frontend/.env.local` holds the project URL and publishable key. When you need to
  use them in a shell command, source the file and never echo the values.
- **Testing auth.** The app talks to a real, remote Supabase project. Don't create accounts or
  sign in on the user's behalf; ask the user to try auth flows themselves.
- **Google sign-in** is coded but the provider is disabled in Supabase until the user adds OAuth
  credentials. The button shows an error until then.
- **Backend folder is gone.** There used to be an Express `Backend/`. It was deleted on purpose;
  don't recreate it.
- **Browser preview width.** The in-app preview pane can be narrow, which hides the 378px
  details panels (they hide under 1100px). Resize the viewport to check desktop layout.
- **Mockup typos.** The Closet mockup shows a "Shoes" category on cards but the filter chip says
  "Footwear". The data model uses `Footwear`.

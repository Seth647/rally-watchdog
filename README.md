# Montagu Road Rally Watchdog

Montagu Road Rally Watchdog is a safety management dashboard for cross-country rally events. It enables stewards to capture incident reports, monitor driver status, and manage follow-up actions through an integrated suite of tools.

## Features

- **Incident reporting** – Collect detailed accounts of on-course issues with driver lookup and unique tracking IDs.
- **Admin dashboard** – Review reports, send warnings, and monitor event activity in real time.
- **Driver registry** – Maintain a searchable catalogue of drivers, vehicles, and contact information.
- **Notifications** – Trigger SMS and WhatsApp alerts to keep teams informed about safety interventions.

## Tech stack

- [Vite](https://vitejs.dev/) with React and TypeScript
- [shadcn/ui](https://ui.shadcn.com/) component system
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Supabase](https://supabase.com/) integration helpers
- [TanStack Query](https://tanstack.com/query/latest) for data fetching

## Getting started

1. Ensure you have a recent version of [Node.js](https://nodejs.org/) (18+) and npm installed.
2. Clone the repository and install dependencies:

   ```bash
   git clone <repository-url>
   cd rally-watchdog
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

   The application will be available at the URL shown in the terminal (defaults to `http://localhost:5173`).

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server with hot module reloading. |
| `npm run build` | Build the production bundle into the `dist` directory. |
| `npm run preview` | Serve the production bundle locally for testing. |
| `npm run lint` | Run ESLint across the project. |

## Deployment

Run `npm run build` and deploy the generated `dist` directory to your preferred static hosting provider (e.g., Netlify, Vercel, or an S3 bucket behind a CDN). Ensure environment variables for Supabase and any messaging providers are configured in your hosting platform before going live.

## Project structure

```
├── public/             # Static assets served as-is
├── src/
│   ├── components/     # Reusable UI building blocks and dialogs
│   ├── hooks/          # Custom React hooks for authentication and admin logic
│   ├── integrations/   # API helpers and external service clients
│   ├── pages/          # Route-level components (dashboard, registry, etc.)
│   └── main.tsx        # Application entry point
└── supabase/           # Supabase configuration and SQL migrations
```

Contributions and feedback are welcome. Open an issue or submit a pull request to suggest improvements or report bugs.

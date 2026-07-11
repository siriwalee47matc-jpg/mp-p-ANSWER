# Production deployment

Sentinel ADS has two deployable services. Deploy the dashboard on Netlify and deploy the API on a persistent Node.js host with PostgreSQL (for example, Render, Railway, Fly.io, or a managed container service). Do not deploy the NestJS API with SQLite to Netlify: serverless storage is ephemeral and would lose case records.

## 1. Create production services

1. Provision a PostgreSQL database and set `DATABASE_URL` to its connection string.
2. Deploy `apps/backend-api` using its Dockerfile.
3. Run `npx prisma db push` once against that production database from a trusted deployment environment. Do not run `npm run prisma:seed`; it is explicitly demo-only.
4. Generate a long random `JWT_SECRET` and set the API environment variables below.

Required API environment variables:

```text
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/sentinel_ads?schema=public
JWT_SECRET=<at-least-32-random-characters>
CORS_ORIGINS=https://YOUR-SITE.netlify.app,https://YOUR-DOMAIN
INITIAL_ADMIN_EMAIL=admin@your-agency.go.th
INITIAL_ADMIN_NAME=System Administrator
INITIAL_ADMIN_PASSWORD=<unique-password-of-at-least-8-characters>
AI_PROVIDER=gemini
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=gemini-3.5-flash
```

The first API start creates the initial administrator only when all three `INITIAL_ADMIN_*` values are supplied. Remove `INITIAL_ADMIN_PASSWORD` after that first successful start. Keep Gemini credentials in the API host's environment variables, never in the dashboard or a committed `.env.example` file.

## 2. Deploy the dashboard on Netlify

1. Import this repository in Netlify. The included `netlify.toml` provides the build command.
2. In Netlify Site configuration, add `NEXT_PUBLIC_API_URL=https://YOUR-API-DOMAIN`.
3. Deploy. Add the resulting Netlify domain to the API's `CORS_ORIGINS` value, then redeploy the API.

## 3. Build the browser extension

The extension is not installed by Netlify. Build it with production endpoints, package the `apps/browser-extension/dist` directory, and distribute it through your approved enterprise browser policy or extension store.

```text
VITE_API_URL=https://YOUR-API-DOMAIN
VITE_DASHBOARD_URL=https://YOUR-SITE.netlify.app
npm run build:extension
```

Before releasing, set a unique extension ID policy and add its origin to the API CORS allow-list if your host requires it.

## Operational guardrails

- Use a real AI provider and monitor false-positive/false-negative outcomes before enabling `AUTO_BLOCK`.
- Keep `AUTO_DETECT` as the starting production mode; blocking must retain a human review route.
- Protect database backups, rotate credentials, and set an alerting mailbox before go-live.
- The API must run behind HTTPS. Never store API keys or production passwords in repository files.

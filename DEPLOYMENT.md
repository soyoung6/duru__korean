# Duru Korean deployment notes

## Recommended branch

Work from `feature/homepage-demo-ai-options`. Keep `main` unchanged until the homepage is reviewed.

## Frontend-only homepage

The new homepage can run without the FastAPI server because it includes two modes:

- Demo response: returns a built-in sample analysis without any external API call.
- My API key: lets the visitor enter a Gemini API key in the browser and call Gemini directly.

For a simple always-on public page:

1. Connect this repository to Vercel or Netlify.
2. Set the project root to `frontend`.
3. Use `npm ci` as the install command.
4. Use `npm run build` as the build command.
5. Deploy the generated Next.js app.

This is the lowest-maintenance option for a portfolio/demo homepage.

## Full app deployment

If you also want login, database history, and server-side analysis:

1. Deploy `frontend` to Vercel or Netlify.
2. Deploy `backend` to Render, Railway, Fly.io, or another Python web host.
3. Provision a MySQL database.
4. Set backend environment variables such as `GEMINI_API_KEY`, database credentials, JWT secret, and payment keys.
5. Change the frontend API base URL in `frontend/src/utils/api.js` from `http://localhost:8000` to the deployed backend URL.
6. Restrict FastAPI CORS origins to the deployed frontend domain before production use.

## API key caution

The homepage's "My API key" option is intended for user-owned keys in a browser session. It does not commit or send the key to this repository. If users choose "save", the key is stored only in that browser's `localStorage`.

For production service accounts, prefer server-side key handling in the FastAPI backend so that shared platform keys are never exposed to the browser.

import { serve } from '@hono/node-server';
import { app } from './server.js';

const port = Number(process.env.PORT) || 3001;

console.log(`Starting TCG Tracker API server on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`Server running at http://localhost:${port}`);

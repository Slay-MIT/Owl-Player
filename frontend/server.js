/**
 * Next.js Server Entry Point (Standalone Mode)
 * This file is required for Docker production builds
 */
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // In production, Next.js serves static files and API routes
  // This is handled by the standalone build
  console.log('Next.js server ready');
}).catch((err) => {
  console.error('Failed to prepare Next.js:', err);
});

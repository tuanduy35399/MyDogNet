import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Only the isolated maintenance API is proxied; never use a production target.
const port = process.env.SANDBOX_API_PORT || '5191';
if (!['5190', '5191'].includes(port)) throw new Error('Sandbox API port must be 5190 or 5191');
const proxy = { '/api': { target: `http://127.0.0.1:${port}`, changeOrigin: true, rewrite: path => path.replace(/^\/api/, '') } };
export default defineConfig({ plugins: [react()], server: { host: '127.0.0.1', proxy }, preview: { host: '127.0.0.1', proxy } });

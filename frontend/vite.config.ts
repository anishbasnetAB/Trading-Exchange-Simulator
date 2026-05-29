import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    // Keeps HMR working when accessing through a forwarded Docker port
    hmr: { clientPort: 3000 },
  },
});

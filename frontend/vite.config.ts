import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const LANDING_PAGE = 'landing.html';

function serveLandingAtRoot() {
  const rewrite = (req: any, _res: any, next: () => void) => {
    if (req.url === '/' || req.url === '') {
      req.url = `/${LANDING_PAGE}`;
    }
    next();
  };
  return {
    name: 'serve-landing-at-root',
    configureServer(server: any) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server: any) {
      server.middlewares.use(rewrite);
    },
  };
}

export default defineConfig({
  envDir: '../',
  plugins: [react(), serveLandingAtRoot()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});

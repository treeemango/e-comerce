import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: env.VITE_SUPABASE_URL
        ? {
            '/supabase': {
              target: env.VITE_SUPABASE_URL,
              changeOrigin: true,
              secure: true,
              ws: true,
              rewrite: (p) => p.replace(/^\/supabase/, ''),
            },
          }
        : undefined,
    },
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'pwa',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        injectRegister: null,
        manifest: false,
        devOptions: {
          enabled: false,
        },
      }),
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    esbuild: {
      pure: mode === 'production' ? ['console.log', 'console.info', 'console.debug'] : [],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});

import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env from parent directory
  const env = loadEnv(mode, path.resolve(__dirname, '../'), '');

  return {
    // Set root env directory to parent to share .env file
    envDir: '../',
    server: {
      port: 3000,
      host: '0.0.0.0',
      fs: {
        // Allow serving files from one level up to the project root
        allow: ['..'],
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        // Point @ to the parent directory to share lib/ and types.ts
        '@': path.resolve(__dirname, '../'),
      }
    }
  };
});

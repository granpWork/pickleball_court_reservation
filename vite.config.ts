import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = parseInt(env.VITE_PORT || env.PORT || '5173', 10);

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: port,
      strictPort: false, // If the port is already in use, Vite automatically tries the next available port (e.g. 5174, 5175)
    },
  };
});

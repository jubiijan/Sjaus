import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    force: true,  // Add this to force dependency optimization
  },
  server: {
    hmr: {
      overlay: false  // Disable the error overlay that might get in the way
    }
  },
  // Add clear cache on startup
  cacheDir: '.vite_cache',  // Custom cache directory for easier clearing
  // Improve build settings
  build: {
    sourcemap: true,  // Makes debugging easier
    commonjsOptions: {
      transformMixedEsModules: true  // Helps with mixed module types
    }
  }
});
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// Vite sirve la app en localhost (necesario para poder usar el micrófono)
// y procesa Tailwind con su plugin.
export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    port: 5173,
  },
});

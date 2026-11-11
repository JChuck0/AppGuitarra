import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';

// Ruta absoluta de un fichero del frontend.
const page = (file) => fileURLToPath(new URL(file, import.meta.url));

// Vite sirve la app en localhost (necesario para poder usar el micrófono)
// y procesa Tailwind con su plugin.
export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    port: 5173,
  },
  // La app tiene varias páginas HTML. Para el build hay que decirle a Vite
  // cuáles son; si no, solo incluiría index.html.
  build: {
    rollupOptions: {
      input: {
        main: page('./index.html'),
        inicio: page('./pages/inicio.html'),
      },
    },
  },
});

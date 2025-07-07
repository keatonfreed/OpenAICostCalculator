import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite';
import wasm from 'vite-plugin-wasm';


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwind(),
    wasm(),
  ],
})

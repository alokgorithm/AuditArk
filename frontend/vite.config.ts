import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  // Tauri expects a fixed port in dev
  server: {
    host: host || 'localhost',
    port: 5173,
    strictPort: true,
  },
  // Prevent vite from obscuring Rust errors
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],
})

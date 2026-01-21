import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: false,
  base: '/assets/',
  build: {
    outDir: 'public/assets',
    emptyOutDir: true,
    target: 'es2020',
    minify: 'terser',
    cssCodeSplit: false,
    rollupOptions: {
      input: 'index.html',
      output: {
        entryFileNames: 'installer.js',
        chunkFileNames: 'installer-[name].js',
        assetFileNames: 'installer.[ext]'
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
});
